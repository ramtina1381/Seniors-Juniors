import argparse
import pandas as pd
import re
import json
import os
from glob import glob
from PIL import Image
import google.generativeai as genai # type: ignore
from difflib import get_close_matches

# Configure Gemini API
genai.configure(api_key="AIzaSyCli1ZWhOri0Yj_-Uk3FsSSiZvBp-78bS8")

def extract_from_image(image_path):
    """You are a data extraction expert. Extract equipment data from image using Gemini"""
    try:
        image = Image.open(image_path)
    except:
        print(f"Could not open image: {image_path}")
        return None

    model = genai.GenerativeModel("gemini-1.5-flash")
    
    prompt = """
      - serial_number: Unique identifier assigned by the manufacturer.
      - part_number: Manufacturer's part code, similar equipments will have similar part numbers.
      - asset_tag: Organization-assigned inventory tag (often starting with ATT and unique for each item. They have orange tag).
      - description: Brief equipment description including:
       - Type (radio, antenna, router, etc.)
       - Key specifications
       - Notable physical features
    
    Example:
    {
      Input: PBP4ACPFAA, LBGEPE16KZ05005702, ATT07025435, RECTIFIER NE050AC48ATEZ

      output: {
        "serial_number": "LBGEPE16KZ05005702",
        "part_number": "PBP4ACPFAA",
        "asset_tag": "ATT07025435",
        "description": "Radio Rectifier NE050AC48ATEZ AX/48V 501"

      }
    }
    """
    
    try:
        response = model.generate_content([prompt, image])
        return response.text
    except Exception as e:
        print(f"Error processing image {image_path}: {str(e)}")
        return None

def clean_json_response(response_text):
    """Clean Gemini response JSON"""
    cleaned = re.sub(r'^```json|```$', '', response_text, flags=re.MULTILINE).strip()
    return cleaned

def ai_description_matcher(extracted_desc, top_candidates_df):
    """
    Use Gemini AI to match an item description against a small subset of likely candidates.
    """
    prompt = f"""
EXTRACTED DESCRIPTION:
{extracted_desc}

CANDIDATE ITEMS (Item Number | Description):
{top_candidates_df[['Item Number', 'Item Description']].to_string(index=False)}

Return the best matching Item Number based on:
- Technical and functional similarity
- Manufacturer or model relevance

Respond ONLY with the item number. If no match: "NO_MATCH"
    """
    
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        return response.text.strip().strip('"')
    except Exception as e:
        print(f"AI matching error: {str(e)}")
        return None

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--location', required=True, help="Location number for inventory")
    parser.add_argument('--output', required=True, help="Output directory path")
    parser.add_argument('--uploads_root', required=True, help="Root directory where uploads are stored")
    args = parser.parse_args()
    uploads_root = args.uploads_root


    # Create output directory if needed
    os.makedirs(args.output, exist_ok=True)

    # STAGE 1: Image Processing
    photo_dir = os.path.join(uploads_root, 'photos', args.location)
    image_files = glob(os.path.join(photo_dir, '*.jpg')) + \
                  glob(os.path.join(photo_dir, '*.jpeg')) + \
                  glob(os.path.join(photo_dir, '*.png'))

              
    if not image_files:
        print("No image files found in uploads directory")
        return

    results = []
    for image_file in image_files:
        print(f"Processing {os.path.basename(image_file)}...")
        response = extract_from_image(image_file)
        
        if response:
            try:
                data = json.loads(clean_json_response(response))
                if isinstance(data, dict):
                    results.append(data)
                elif isinstance(data, list):
                    results.extend(data)
            except json.JSONDecodeError as e:
                print(f"Failed to parse response for {image_file}: {e}")

    if not results:
        print("No valid results extracted from images")
        return

    # Create initial dataframe
    df_extracted = pd.DataFrame(results)
    
    # STAGE 2: Manufacturer Matching
    manufacturer_dir = os.path.join(uploads_root, 'manufacturer', args.location)
    manufacturer_files = glob(os.path.join(manufacturer_dir, '*.xlsx')) + \
                        glob(os.path.join(manufacturer_dir, '*.xls'))


      
    if not manufacturer_files:
      print("No manufacturer file found")
      return
    
    df_manufacturers = pd.read_excel(manufacturer_files[0])
    
    # Clean and standardize column names
    df_manufacturers.columns = [re.sub(r'\s+', ' ', col).strip() for col in df_manufacturers.columns]
    
    # Identify key columns
    col_map = {
        'part_number': next((c for c in df_manufacturers.columns if 'manufacturer part number' in c.lower()), None),
        'item_number': next((c for c in df_manufacturers.columns if 'item number' in c.lower()), None),
        'item_description': next((c for c in df_manufacturers.columns if 'item description' in c.lower()), None)
    }
    
    if None in col_map.values():
        print("Required columns not found in manufacturer file")
        return
    
    df_manufacturers = df_manufacturers.rename(columns=col_map)
    
    # Clean data
    df_extracted['part_number'] = df_extracted['part_number'].astype(str).str.strip().str.upper()
    df_manufacturers['Manufacturer Part Number'] = df_manufacturers['Manufacturer Part Number'].astype(str).str.strip().str.upper()

    # Matching process
    matched_data = []
    for _, row in df_extracted.iterrows():
        # Try exact match first
        exact_matches = df_manufacturers[df_manufacturers['Manufacturer Part Number'] == row['part_number']]
        if not exact_matches.empty:
            matched = row.to_dict()
            matched['item_number'] = exact_matches.iloc[0]['Item Number']
            matched['match_method'] = 'exact'
            matched_data.append(matched)
            continue
            
        # Try AI description matching with trimmed candidate set
        if pd.notna(row.get('description')):
            # Narrow candidates using partial description keyword match or randomly sample top 20
            top_candidates = df_manufacturers[
                df_manufacturers['Item Description'].str.contains(
                    row['description'].split()[0], case=False, na=False
                )
            ]
            if top_candidates.empty:
                top_candidates = df_manufacturers.sample(min(20, len(df_manufacturers)))

            ai_match = ai_description_matcher(row['description'], top_candidates)

            if ai_match and ai_match != "NO_MATCH":
                matched = row.to_dict()
                matched['item_number'] = ai_match
                matched['match_method'] = 'ai_description'
                matched_data.append(matched)
                continue
                
        # Fallback to fuzzy matching
        close_matches = get_close_matches(
            row['part_number'],
            df_manufacturers['Manufacturer Part Number'].unique(),
            n=1,
            cutoff=0.7
        )
        if close_matches:
            matched = row.to_dict()
            matched['item_number'] = df_manufacturers[
                df_manufacturers['part_number'] == close_matches[0]
            ].iloc[0]['item_number']
            matched['match_method'] = 'fuzzy'
        else:
            matched = row.to_dict()
            matched['item_number'] = None
            matched['match_method'] = 'no_match'
            
        matched_data.append(matched)

    # Create final output
    df_final = pd.DataFrame(matched_data)
    
    # Add location and other required fields
    df_final['From location'] = args.location
    df_final['Quantity'] = 1
    df_final['Quality'] = 'Good'
    df_final['WERF#'] = ''
    df_final['WRT#'] = '' 
    df_final['TOE TAG #'] = ''
    
    # Select and rename final columns
    output_columns = {
        'asset_tag': 'Asset Tag #',
        'serial_number': 'Serial Number',
        'item_number': 'Item Number',
        'part_number': 'Mfr Part number',
        'From location': 'From location',
        'Quantity': 'Quantity',
        'Quality': 'Quality',
        'WERF#': 'WERF#',
        'WRT#': 'WRT#',
        'TOE TAG #': 'TOE TAG #'
    }
    
    df_output = df_final[[col for col in output_columns.keys() if col in df_final.columns]]
    df_output = df_output.rename(columns=output_columns)
    
    # Save results
    output_path = os.path.join(args.output, 'equipment_inventory.csv')
    df_output.to_csv(output_path, index=False)
    print(f"\nProcessing complete. Results saved to {output_path}")
    
    # Print summary
    print("\n=== Matching Summary ===")
    print(df_final['match_method'].value_counts())

if __name__ == "__main__":
    main()