import argparse
import pandas as pd
import re
import json
import os
import sys
import traceback
from glob import glob
from PIL import Image, UnidentifiedImageError
from difflib import get_close_matches
import logging
from datetime import datetime
import openai
from openai import OpenAI
from dotenv import load_dotenv
load_dotenv()  # This loads the .env file
import base64

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('equipment_processor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class EquipmentProcessorError(Exception):
    """Custom exception for equipment processing errors"""
    pass

def configure_openai():
    """Configure OpenAI API with error handling"""
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise EquipmentProcessorError("Missing OpenAI API key")
        
        client = OpenAI(api_key=api_key)
        logger.info("OpenAI API configured successfully")
        return client
    except Exception as e:
        raise EquipmentProcessorError(f"OpenAI configuration failed: {str(e)}")

def extract_from_image(image_path, client):
    """Enhanced extraction to capture all relevant text"""
    try:
        logger.info(f"Processing image: {image_path}")
        
        try:
            image = Image.open(image_path)
            # Convert image to bytes for API upload
            from io import BytesIO
            byte_stream = BytesIO()
            image.save(byte_stream, format='PNG')
            byte_data = byte_stream.getvalue()
        except (IOError, UnidentifiedImageError) as e:
            logger.error(f"Invalid image file: {image_path} - {str(e)}")
            return None

        example_text = """
        Input: PBP4ACPFAA, LBGEPE16KZ05005702, ATT07025435, RECTIFIER NE050AC48ATEZ

        output: {
            "serial_number": "LBGEPE16KZ05005702",
            "part_number": "PBP4ACPFAA",
            "asset_tag": "ATT07025435",
            "description": "Radio Rectifier NE050AC48ATEZ AX/48V 501"
        }
        """
        
        prompt = f"""
You are a data extraction expert. Extract **all radios and antennas in photo** from the image and classify the following text into structured JSON with the keys:

- serial_number (Unique identifier)
- part_number (Similar equipment would have similar part numbers)
- asset_tag (must start with ATT)
      - description: Brief equipment description including:
       - Type (radio, antenna, router, etc.)
       - Key specifications
       - Notable physical features
       
If there are multiple items, return a list of JSON objects. If a field is not present, return null.

{example_text}

Text:
Now extract from this image:
        """
        encoded_image = base64.b64encode(byte_data).decode("utf-8")

        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{encoded_image}"}},
                    ],
                }
            ],
            max_tokens=1000,
        )
        
        if not response.choices or not response.choices[0].message.content:
            logger.warning(f"No content returned from OpenAI for image: {image_path}")
            return None
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"OpenAI processing failed for {image_path}: {str(e)}")
        return None

def clean_json_response(response_text):
    """Clean OpenAI response JSON"""
    try:
        cleaned = re.sub(r'^```json|```$', '', response_text, flags=re.MULTILINE).strip()
        return cleaned
    except Exception as e:
        logger.error(f"Error cleaning JSON response: {str(e)}")
        return None

def ai_description_matcher(extracted_desc, df_manufacturers, client):
    """You are a technical equipment expert. Your task is to identify the best matching item number from a manufacturer file based on the extracted description.

            The match should prioritize:
            - Similar part or model numbers or item description
            - Functional and keyword similarity (e.g., radio, antenna, rectifier)
            - Ignoring irrelevant differences"""
    try:
        # First try exact matches in the description
        for _, row in df_manufacturers.iterrows():
            if pd.notna(row['Item Description']) and str(row['Item Description']).lower() in extracted_desc.lower():
                return row['Item Number']
        
        # Then try partial matches
        for _, row in df_manufacturers.iterrows():
            if pd.notna(row['Item Description']):
                desc_words = str(row['Item Description']).lower().split()
                if any(word in extracted_desc.lower() for word in desc_words if len(word) > 3):
                    return row['Item Number']
        
        # Only use API if no matches found
        prompt = f"""
EXTRACTED DESCRIPTION:
{extracted_desc}

CANDIDATE ITEMS (Item Number | Item Description):
{df_manufacturers[['Item Number', 'Item Description']].to_string(index=False)}

    Return ONLY the best matching Item Number considering:
    1. Manufacturer Item Description with item description
    2. Functional equivalence
    3. Manufacturer/model compatibility
        """
        
        response = client.chat.completions.create(
            model="gpt-4.1-mini",  # Use cheaper model for this task
            messages=[
                {"role": "system", "content": "You are a helpful assistant that matches technical equipment descriptions."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=100,
            temperature=0.1  # More deterministic output
        )
        
        result = response.choices[0].message.content.strip().strip('"')
        return result if result in df_manufacturers['Item Number'].values else None
    except Exception as e:
        logger.error(f"AI matching error: {str(e)}")
        return None

def load_manufacturer_data(file_path):
    """Load manufacturer data"""
    try:
        df = pd.read_excel(file_path, sheet_name='Network_Extract')
        df.columns = [col.strip() for col in df.columns]

        required = ['Item Number', 'Manufacturer Part Number', 'Item Description']
        for req_col in required:
            if req_col not in df.columns:
                raise EquipmentProcessorError(f"Missing required column in manufacturer file: {req_col}")

        return df
    except Exception as e:
        raise EquipmentProcessorError(f"Error loading manufacturer data: {str(e)}")

def save_results(df, output_path):
    """Save final output CSV with proper path handling"""
    try:
        # Create directory if it doesn't exist
        output_dir = os.path.dirname(output_path)
        if output_dir:  # Only create if path has a directory
            os.makedirs(output_dir, exist_ok=True)
        
        # Ensure the path ends with .csv
        if not output_path.lower().endswith('.csv'):
            output_path = os.path.join(output_dir, 'output', 'equipment_inventory.csv')
        
        df.to_csv(output_path, index=False)
        logger.info(f"Results saved to: {output_path}")
    except Exception as e:
        raise EquipmentProcessorError(f"Failed to save results: {str(e)}")

def main():
    try:
        logger.info("=" * 60)
        logger.info(f"Starting equipment processing at {datetime.now()}")
        logger.info("=" * 60)

        parser = argparse.ArgumentParser()
        parser.add_argument('--location', required=True)
        parser.add_argument('--output', required=True)
        parser.add_argument('--uploads_root', required=True)
        args = parser.parse_args()

        client = configure_openai()

        photo_dir = os.path.join(args.uploads_root, 'photos', args.location)
        image_files = glob(os.path.join(photo_dir, '*.jpg')) + \
                      glob(os.path.join(photo_dir, '*.jpeg')) + \
                      glob(os.path.join(photo_dir, '*.png'))

        if not image_files:
            raise EquipmentProcessorError(f"No images found in {photo_dir}")

        results = []
        for image_file in image_files:
            response = extract_from_image(image_file, client)
            if response:
                cleaned = clean_json_response(response)
                if cleaned:
                    try:
                        data = json.loads(cleaned)
                        if isinstance(data, dict):
                            data['image_file'] = image_file
                            results.append(data)
                        elif isinstance(data, list):
                            for item in data:
                                item['image_file'] = image_file
                                results.append(item)
                    except json.JSONDecodeError as e:
                        logger.error(f"JSON decode error in {image_file}: {e}")

        if not results:
            raise EquipmentProcessorError("No valid data extracted from images")

        df_extracted = pd.DataFrame(results)
        manufacturer_dir = os.path.join(args.uploads_root, 'manufacturer', args.location)
        manufacturer_files = glob(os.path.join(manufacturer_dir, '*.xlsx')) + glob(os.path.join(manufacturer_dir, '*.xls'))

        if not manufacturer_files:
            raise EquipmentProcessorError(f"No manufacturer files found in {manufacturer_dir}")

        df_manufacturers = load_manufacturer_data(manufacturer_files[0])

        # Normalize values
        df_extracted['part_number'] = df_extracted['part_number'].astype(str).str.upper().str.strip()
        df_manufacturers['Manufacturer Part Number'] = df_manufacturers['Manufacturer Part Number'].astype(str).str.upper().str.strip()

        matched_data = []
        for _, row in df_extracted.iterrows():
            matched = row.copy()

            # Stage 1: Exact part number match
            exact = df_manufacturers[df_manufacturers['Manufacturer Part Number'] == row['part_number']]
            if not exact.empty:
                matched['item_number'] = exact.iloc[0]['Item Number']
                matched['match_method'] = 'exact_part_number'
                matched_data.append(matched)
                continue

            # Stage 2: Try to find in description without API call
            if pd.notna(row.get('description')):
                # First try exact matches in manufacturer descriptions
                for _, mfr_row in df_manufacturers.iterrows():
                    if pd.notna(mfr_row['Item Description']) and str(mfr_row['Item Description']).lower() in row['description'].lower():
                        matched['item_number'] = mfr_row['Item Number']
                        matched['match_method'] = 'exact_description_match'
                        matched_data.append(matched)
                        break
                else:
                    # Only use API if no matches found
                    ai_match = ai_description_matcher(row['description'], df_manufacturers, client)
                    if ai_match and ai_match in df_manufacturers['Item Number'].values:
                        matched['item_number'] = ai_match
                        matched['match_method'] = 'ai_description_match'
                        matched_data.append(matched)
                        continue

            # Stage 3: Fuzzy match on part number
            close_matches = get_close_matches(
                row['part_number'],
                df_manufacturers['Manufacturer Part Number'].unique(),
                n=1,
                cutoff=0.7
            )
            if close_matches:
                matched['item_number'] = df_manufacturers[
                    df_manufacturers['Manufacturer Part Number'] == close_matches[0]
                ].iloc[0]['Item Number']
                matched['match_method'] = 'fuzzy_part_number'
            else:
                matched['item_number'] = None
                matched['match_method'] = 'no_match'

            matched_data.append(matched)

        df_final = pd.DataFrame(matched_data)
        df_final['From location'] = args.location

        # Prepare output
        output_columns = {
            'asset_tag': 'Asset Tag #',
            'serial_number': 'Serial Number',
            'item_number': 'Item Number',
            'part_number': 'Mfr Part number',
            'From location': 'From location',
            'quantity': 'Quantity',
            'quality': 'Quality',
            'werf': 'WERF#',
            'wrt': 'WRT#',
            'toe_tag': 'Toe Tag #'
        }

        df_output = df_final[[k for k in output_columns if k in df_final.columns]]
        df_output = df_output.rename(columns=output_columns)
        df_output['Quantity'] = 1
        df_output['Quality'] = 'Good'
        df_output['WERF#'] = ' '
        df_output['WRT#'] = ' '
        df_output['Toe Tag #'] = ' '
        save_results(df_output, args.output)

    except EquipmentProcessorError as e:
        logger.error(f"Equipment Processor Error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        traceback.print_exc()

if __name__ == "__main__":
    main()