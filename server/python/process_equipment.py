import argparse
import pandas as pd
import re
import json
import os
import sys
import traceback
from glob import glob
from PIL import Image, UnidentifiedImageError
import google.generativeai as genai
from difflib import get_close_matches
import logging
from datetime import datetime

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

def configure_gemini():
    """Configure Gemini API with error handling"""
    try:
        api_key = "AIzaSyAKxLq89_wqrA8eZI9mebnDJKioBe52XaM"
        if not api_key:
            raise EquipmentProcessorError("Missing Gemini API key")
        
        genai.configure(api_key=api_key)
        logger.info("Gemini API configured successfully")
        return genai.GenerativeModel("gemini-1.5-flash")
    except Exception as e:
        raise EquipmentProcessorError(f"Gemini configuration failed: {str(e)}")

def extract_from_image(image_path, model):
    """Extract equipment data from image using Gemini"""
    try:
        logger.info(f"Processing image: {image_path}")
        
        try:
            image = Image.open(image_path)
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

- serial_number
- part_number
- asset_tag
- description

If there are multiple items, return a list of JSON objects. If a field is not present, return null.

{example_text}

Text:
Now extract from this image:
        """
        
        response = model.generate_content([prompt, image])
        if not response.text:
            logger.warning(f"No content returned from Gemini for image: {image_path}")
            return None
        return response.text
    except Exception as e:
        logger.error(f"Gemini processing failed for {image_path}: {str(e)}")
        return None

def clean_json_response(response_text):
    """Clean Gemini response JSON"""
    try:
        cleaned = re.sub(r'^```json|```$', '', response_text, flags=re.MULTILINE).strip()
        return cleaned
    except Exception as e:
        logger.error(f"Error cleaning JSON response: {str(e)}")
        return None

def ai_description_matcher(extracted_desc, df_manufacturers, model):
    """Use Gemini AI to match an item description to manufacturer data"""
    try:
        prompt = f"""
EXTRACTED DESCRIPTION:
{extracted_desc}

CANDIDATE ITEMS (Item Number | Item Description):
{df_manufacturers[['Item Number', 'Item Description']].to_string(index=False)}

Return the best matching Item Number based on:
- Technical and functional similarity
- Manufacturer or model relevance

Respond ONLY with the Item Number. If no match: "NO_MATCH"
        """
        response = model.generate_content(prompt)
        return response.text.strip().strip('"')
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
    """Save final output CSV"""
    try:
        required_columns = ['Asset Tag #', 'Serial Number', 'Item Number', 'Mfr Part number']
        missing_cols = [col for col in required_columns if col not in df.columns]
        if missing_cols:
            raise EquipmentProcessorError(f"Missing required columns: {missing_cols}")

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
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

        model = configure_gemini()

        photo_dir = os.path.join(args.uploads_root, 'photos', args.location)
        image_files = glob(os.path.join(photo_dir, '*.jpg')) + \
                      glob(os.path.join(photo_dir, '*.jpeg')) + \
                      glob(os.path.join(photo_dir, '*.png'))

        if not image_files:
            raise EquipmentProcessorError(f"No images found in {photo_dir}")

        results = []
        for image_file in image_files:
            response = extract_from_image(image_file, model)
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

            # Stage 2: AI description match
            if pd.notna(row.get('description')):
                ai_match = ai_description_matcher(row['description'], df_manufacturers, model)
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
            'From location': 'From location'
        }

        df_output = df_final[[k for k in output_columns if k in df_final.columns]]
        df_output = df_output.rename(columns=output_columns)
        save_results(df_output, args.output)

    except EquipmentProcessorError as e:
        logger.error(f"Equipment Processor Error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        traceback.print_exc()

if __name__ == "__main__":
    main()
