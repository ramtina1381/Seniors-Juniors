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
import requests
import imagehash
from collections import defaultdict# Configure logging
from requests_toolbelt.multipart.encoder import MultipartEncoder


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
    """You are a data and text extraction expert"""
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
        
        prompt = f"""
You are an expert in structured data extraction from technical images. Extract relevant text from the image and return a structured JSON object using the following keys:

### Task
First, review the **clear examples** provided to learn the formatting, character shapes, and data layout patterns. Then, use that understanding to extract structured data from the less-clear target image.
After learning from clear images, you can iterate through the unclear ones with better accuracy.
Each image, may include serveral parts, make sure to include all the following information from all different parts per image.

- **serial_number**: A unique identifier often prefixed with (S) or Serial:, may appear near a barcode. It may start with BH, AB, CC, A, B, TU, QS.
- **part_number**: Identifies a specific item. Items of the same model share the same part number. Often prefixed with (1P) or start with KRC, BML, 11/COH, BMG, BGM, JAHH. They have at least 6 chars (letters or digits).
- **asset_tag**: Always starts with 'ATT' or 'C'. The tag's color is orange always.
- **description**: A concise description of the item, including:
  - Type (e.g., antenna, radio, rectifier, router, etc.)
  - Key specifications (if available)
  - Physical or notable features
  - Optionally enhanced using web knowledge or inference from the part number

Return a **list of JSON objects** if multiple items are present. Use `null` for missing fields.

Handle skewed, rotated, or blurry images by attempting to extract text from all regions and angles in the image. learn the shape of numbers
and letters from clear images and iterate over the non-clear images to have the strongest guess. 

### Examples

Input: PBP4ACPFAA, LBGEPE16KZ05005702, ATT07025435, RECTIFIER NE050AC48ATEZ  
Output:
```json
{{
  "serial_number": "LBGEPE16KZ05005702",
  "part_number": "PBP4ACPFAA",
  "asset_tag": "ATT07025435",
  "description": "Radio Rectifier NE050AC48ATEZ AX/48V 501"
}} ```

### Example 2
Input: X,mm,1°,93,2°,132,4°,209,5°,248,6°,287,8°,365,10°,442,Antenna,(1P)KRE 101 2283/1,(S)T0M1049689,(1P) CS7278761.01,(S) SYZ191049689, 8-port Antena 2LB 24 65
output:
```
{{
    "serial_number" : "T0M1049689",
    "part_number" : "KRE1012283/1",
    "asset_Tag" : " ",
    "description" : Antenna 8 port 65 degree
    
}} ```
        """
        encoded_image = base64.b64encode(byte_data).decode("utf-8")

        response = client.chat.completions.create(
            model="o4-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{encoded_image}"}},
                    ],
                }
            ],
            max_completion_tokens=1000
            )
        
        if not response.choices or not response.choices[0].message.content:
            logger.warning(f"No content returned from OpenAI for image: {image_path}")
            return None
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"OpenAI processing failed for {image_path}: {str(e)}")
        return None

def clean_json_response(response_text):
    """Clean OpenAI response JSON and remove spaces from part/serial numbers"""
    try:
        # Remove JSON code block markers
        cleaned = re.sub(r'^```json|```$', '', response_text, flags=re.MULTILINE).strip()
        
        # Parse JSON
        data = json.loads(cleaned)
        
        # Clean part_number and serial_number (remove all whitespace)
        if isinstance(data, dict):
            if 'part_number' in data and data['part_number']:
                data['part_number'] = re.sub(r'\s+', '', str(data['part_number']))
            if 'serial_number' in data and data['serial_number']:
                data['serial_number'] = re.sub(r'\s+', '', str(data['serial_number']))
            return json.dumps(data)
        
        elif isinstance(data, list):
            for item in data:
                if 'part_number' in item and item['part_number']:
                    item['part_number'] = re.sub(r'\s+', '', str(item['part_number']))
                if 'serial_number' in item and item['serial_number']:
                    item['serial_number'] = re.sub(r'\s+', '', str(item['serial_number']))
            return json.dumps(data)
        
        return cleaned
    except Exception as e:
        logger.error(f"Error cleaning JSON response: {str(e)}")
        return None

def ai_description_matcher(extracted_desc, df_manufacturers, client):
    """You are a technical equipment expert. Your task is to identify the best matching item number from a manufacturer file based on the extracted description.
        If this function is used, include a * infront of the item number extracted. 
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
            model="o4-mini",  # Use cheaper model for this task
            messages=[
                {"role": "system", "content": "You are a helpful assistant that matches technical equipment descriptions."},
                {"role": "user", "content": prompt}
            ],
            max_completion_tokens=100
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
    
    
    
# Monday Connection
def upload_to_monday(item_data, image_path):
    """Upload item data and image to Monday.com"""
    try:
        logger.info("="*40)
        logger.info("Starting Monday.com upload process")
        logger.info(f"Item data: {item_data}")
        logger.info(f"Image path: {image_path}")
        
        monday_api_key = os.getenv("MONDAY_API_KEY")
        board_id = os.getenv("MONDAY_BOARD_ID")
        group_id = "topics"  # Change this to your board's group name
        
        logger.info(f"Monday API Key: {'*****' if monday_api_key else 'Not found'}")
        logger.info(f"Board ID: {board_id}")
        
        if not monday_api_key or not board_id:
            logger.error("Monday.com credentials not configured")
            return False

        headers = {
            "Authorization": monday_api_key,
            "Content-Type": "application/json"
        }

        # Get your actual column IDs from Monday's API playground
        column_values = {
            "text_mks0f8z3": item_data.get("serial_number", ""),  # Serial Number
            "text_mks0ee0c": item_data.get("part_number", ""),   # Part Number
            "text_mks0hc83": item_data.get("asset_tag", ""),     # Asset Tag
            "text_mks0345h": item_data.get("description", "")    # Description
        }

        # Clean None values
        column_values = {k: (v if v is not None else "") for k, v in column_values.items()}
        item_name = item_data.get("item_number", "Unnamed Equipment")[:255]
        
        logger.info("Prepared column values:")
        for k, v in column_values.items():
            logger.info(f"  {k}: {v}")
        logger.info(f"Item name: {item_name}")

        query = """
        mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
            create_item(
                board_id: $boardId,
                item_name: $itemName,
                column_values: $columnValues
            ) {
                id
            }
        }
        """
        
        variables = {
            "boardId": board_id,
            "itemName": item_name,
            "columnValues": json.dumps(column_values)
        }

        logger.info("Preparing GraphQL request:")
        logger.info(f"Query: {query}")
        logger.info(f"Variables: {variables}")

        # First request - create item
        logger.info("Sending request to Monday.com API...")
        response = requests.post(
            "https://api.monday.com/v2",
            json={"query": query, "variables": variables},
            headers=headers
        )
        
        logger.info(f"Received response. Status code: {response.status_code}")
        logger.info(f"Response text: {response.text}")
        
        try:
            response.raise_for_status()
            response_data = response.json()
            logger.info(f"Full response data: {response_data}")
            
            if "errors" in response_data:
                logger.error(f"Monday.com API error: {response_data['errors']}")
                return False

            if "data" not in response_data or "create_item" not in response_data["data"]:
                logger.error("Unexpected response structure from Monday.com")
                logger.error(f"Full response: {response_data}")
                return False

            item_id = response_data["data"]["create_item"]["id"]
            logger.info(f"Successfully created Monday.com item ID: {item_id}")

        except requests.exceptions.HTTPError as http_err:
            logger.error(f"HTTP error occurred: {http_err}")
            logger.error(f"Response content: {response.text}")
            return False
        except ValueError as json_err:
            logger.error(f"JSON decode error: {json_err}")
            logger.error(f"Response content: {response.text}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error processing response: {e}")
            logger.error(f"Response content: {response.text}")
            return False

        # Replace your image upload code with this version
        logger.info("Preparing image upload...")
        try:
            if not os.path.exists(image_path):
                logger.error(f"Image file not found: {image_path}")
                return False

            # Read the file content
            with open(image_path, "rb") as img_file:
                file_content = img_file.read()

            # Prepare the multipart form data with MAP field
            m = MultipartEncoder(
                fields={
                    'query': """
                        mutation ($file: File!, $itemId: ID!) {
                            add_file_to_column(
                                file: $file,
                                item_id: $itemId,
                                column_id: "file_mks0z9er"
                            ) {
                                id
                            }
                        }
                    """,
                    'variables': json.dumps({"itemId": item_id}),
                    'map': json.dumps({"file": ["variables.file"]}),  # THIS IS CRITICAL
                    'file': (os.path.basename(image_path), file_content, 'image/jpeg')
                }
            )

            headers = {
                "Authorization": monday_api_key,
                "Content-Type": m.content_type
            }

            logger.info("Sending image upload request...")
            upload_response = requests.post(
                "https://api.monday.com/v2/file",
                headers=headers,
                data=m
            )

            logger.info(f"Image upload response status: {upload_response.status_code}")
            logger.info(f"Image upload response text: {upload_response.text}")

            upload_response.raise_for_status()
            upload_data = upload_response.json()

            if "errors" in upload_data:
                logger.error(f"Image upload failed: {upload_data['errors']}")
                return False

            logger.info("Image successfully uploaded to Monday.com")
            return True

        except Exception as upload_err:
            logger.error(f"Image upload failed: {str(upload_err)}")
            logger.error(traceback.format_exc())
            return False

    except Exception as e:
        logger.error(f"Monday.com upload failed with unexpected error: {str(e)}")
        logger.error(traceback.format_exc())
        return False

def main():
    try:
        logger.info("=" * 60)
        logger.info(f"Starting equipment processing at {datetime.now()}")
        logger.info("=" * 60)

        # Add Monday.com configuration check
        logger.info("Checking Monday.com configuration:")
        logger.info(f"MONDAY_API_KEY exists: {'Yes' if os.getenv('MONDAY_API_KEY') else 'No'}")
        logger.info(f"MONDAY_BOARD_ID: {os.getenv('MONDAY_BOARD_ID')}")

        parser = argparse.ArgumentParser()
        parser.add_argument('--location', required=True)
        parser.add_argument('--output', required=True)
        parser.add_argument('--uploads_root', required=True)
        args = parser.parse_args()

        client = configure_openai()

        # Image processing
        photo_dir = os.path.join(args.uploads_root, 'photos', args.location)
        image_files = glob(os.path.join(photo_dir, '*.jpg')) + \
                     glob(os.path.join(photo_dir, '*.jpeg')) + \
                     glob(os.path.join(photo_dir, '*.png'))

        if not image_files:
            raise EquipmentProcessorError(f"No images found in {photo_dir}")

        # Duplicate image detection
        hashes = defaultdict(list)
        for image_path in image_files:
            try:
                with Image.open(image_path) as img:
                    img_hash = imagehash.average_hash(img)
                    hashes[str(img_hash)].append(image_path)
            except Exception as e:
                logger.warning(f"Failed to hash image {image_path}: {e}")

        for h, paths in hashes.items():
            if len(paths) > 1:
                logger.warning(f"Duplicate image group found (hash {h}):")
                for p in paths:
                    logger.warning(f"  - {p}")

        # Data extraction
        results = []
        for image_file in image_files:
            logger.info(f"\nProcessing image: {image_file}")
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
                        logger.info(f"Extracted data: {data}")
                    except json.JSONDecodeError as e:
                        logger.error(f"JSON decode error in {image_file}: {e}")

        if not results:
            raise EquipmentProcessorError("No valid data extracted from images")

        df_extracted = pd.DataFrame(results)
        logger.info(f"\nExtracted data summary:\n{df_extracted.head()}")

        # Manufacturer data loading
        manufacturer_dir = os.path.join(args.uploads_root, 'manufacturer', args.location)
        manufacturer_files = glob(os.path.join(manufacturer_dir, '*.xlsx')) + \
                           glob(os.path.join(manufacturer_dir, '*.xls'))

        if not manufacturer_files:
            raise EquipmentProcessorError(f"No manufacturer files found in {manufacturer_dir}")

        df_manufacturers = load_manufacturer_data(manufacturer_files[0])
        logger.info(f"\nManufacturer data loaded. Columns: {df_manufacturers.columns.tolist()}")
        logger.info(f"Sample manufacturer data:\n{df_manufacturers.head()}")

        # Data normalization
        df_extracted['part_number'] = df_extracted['part_number'].astype(str).str.upper().str.strip()
        df_manufacturers['Manufacturer Part Number'] = df_manufacturers['Manufacturer Part Number'].astype(str).str.upper().str.strip()

        # Matching and Monday upload
        matched_data = []
        for idx, row in df_extracted.iterrows():
            logger.info(f"\nProcessing row {idx}:")
            logger.info(json.dumps(row.to_dict(), indent=2))
            
            matched = row.copy()
            matched['match_method'] = None
            matched['item_number'] = None

            # Stage 1: Exact part number match
            exact = df_manufacturers[df_manufacturers['Manufacturer Part Number'] == row['part_number']]
            if not exact.empty:
                matched['item_number'] = exact.iloc[0]['Item Number']
                matched['match_method'] = 'exact_part_number'
                logger.info(f"Exact match found: {matched['item_number']}")
                matched_data.append(matched)
                # Monday.com upload attempt
                logger.info("\nAttempting Monday.com upload with:")
                logger.info(f"Item data: {matched.to_dict()}")
                logger.info(f"Image path: {row['image_file']}")
                        
                if upload_to_monday(matched, row['image_file']):
                    logger.info(f"Successfully uploaded {row['image_file']} to Monday.com")
                else:
                    logger.error(f"Failed to upload {row['image_file']} to Monday.com")
                continue

            # Stage 2: Description matching
            if pd.notna(row.get('description')):
                logger.info("Attempting description matching...")
                # First try exact matches
                for _, mfr_row in df_manufacturers.iterrows():
                    if pd.notna(mfr_row['Item Description']) and \
                       str(mfr_row['Item Description']).lower() in row['description'].lower():
                        matched['item_number'] = mfr_row['Item Number']
                        matched['match_method'] = 'exact_description_match'
                        logger.info(f"Description match found: {matched['item_number']}")
                        matched_data.append(matched)
                        break
                else:
                    # AI matching if no exact matches
                    ai_match = ai_description_matcher(row['description'], df_manufacturers, client)
                    if ai_match and ai_match in df_manufacturers['Item Number'].values:
                        matched['item_number'] = ai_match
                        matched['match_method'] = 'ai_description_match'
                        logger.info(f"AI description match found: {matched['item_number']}")
                        matched_data.append(matched)
                        continue

            # Stage 3: Fuzzy matching
            logger.info("Attempting fuzzy matching...")
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
                logger.info(f"Fuzzy match found: {matched['item_number']}")
            else:
                matched['match_method'] = 'no_match'
                logger.warning("No match found for this item")


            matched_data.append(matched)
            logger.info("-" * 40)  # Visual separator

        # Final output preparation
        df_final = pd.DataFrame(matched_data)
        df_final['From location'] = args.location
        logger.info(f"\nFinal matched data:\n{df_final}")

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
            'toe_tag': 'Toe Tag #',
            'match_method': 'Match Method'
        }

        df_output = df_final[[k for k in output_columns if k in df_final.columns]]
        df_output = df_output.rename(columns=output_columns)
        df_output['Quantity'] = 1
        df_output['Quality'] = 'Good'
        df_output['WERF#'] = ' '
        df_output['WRT#'] = ' '
        df_output['Toe Tag #'] = ' '

        save_results(df_output, args.output)
        logger.info(f"\nResults saved to: {args.output}")

    except EquipmentProcessorError as e:
        logger.error(f"Equipment Processor Error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        traceback.print_exc()

if __name__ == "__main__":
    main()