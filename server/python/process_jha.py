import os
import re
import openai
from openai import OpenAI
import pandas as pd
from datetime import datetime
from PyPDF2 import PdfReader
import pytz
from dotenv import load_dotenv
import argparse
import json
import xlwings as xw
import base64
from PyPDF2.generic import NameObject
from pdf2image import convert_from_path
import pytesseract as Output
import pytesseract
from PIL import Image
import cv2
import numpy as np

# Parse command-line arguments
parser = argparse.ArgumentParser(description="Process JHA PDF files.")
parser.add_argument('--uploads_root', required=True, help='Root uploads directory')
parser.add_argument('--location', required=True, help='Location identifier')
args = parser.parse_args()

# Load environment variables
load_dotenv()

# Configure OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Constants
UPLOADS_ROOT = args.uploads_root
LOCATION = arg2s.location
PDF_DIR = os.path.join(UPLOADS_ROOT, 'jha', LOCATION, 'pdfs')
EXCEL_TEMPLATE = os.path.join(UPLOADS_ROOT, 'jha', LOCATION, 'excel')
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'output', 'jha', LOCATION)
os.makedirs(OUTPUT_DIR, exist_ok=True)
OUTPUT_EXCEL = os.path.join(OUTPUT_DIR, "jha_processed.xlsx")
TIMEZONE = pytz.timezone('America/New_York')

def extract_text_with_checkbox(pdf_path):
    combined_text = ""
    checkbox_detected = False

    checkmark_patterns = [
        r"[\[|{(]?\s*[✔✓☑Xx■]\s*[\]|})]?\s*WORKING AT HEIGHTS",  # handles most visual marks
        r"WORKING AT HEIGHTS\s*[:\-]?\s*(✔|✓|☑|X|x|■)",            # handles suffix cases
    ]

    try:
        with open(pdf_path, 'rb') as file:
            reader = PdfReader(file)
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text:
                    combined_text += page_text

                    # Normalize whitespace for accurate regex matching
                    normalized = ' '.join(page_text.split()).upper()
                    
                    for pattern in checkmark_patterns:
                        if re.search(pattern, normalized):
                            print(f"[✔] Found checkbox mark on page {i+1} matching pattern: {pattern}")
                            checkbox_detected = True
                            break
                if checkbox_detected:
                    break

        return combined_text

    except Exception as e:
        print(f"[✘] Failed to process PDF: {e}")
        return "", False
    
def detect_working_at_heights_checked(pdf_path):
    """Optimized for right-side checkboxes with visual debugging"""
    try:
        # Convert PDF to high-res image (adjust DPI as needed)
        images = convert_from_path(pdf_path, dpi=300)
        
        for page_num, image in enumerate(images):
            # Convert to OpenCV format and preprocess
            img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
            
            # Find "WORKING AT HEIGHTS" text position
            ocr_data = pytesseract.image_to_data(gray, output_type=pytesseract.Output.DICT)
            
            for i, text in enumerate(ocr_data['text']):
                if "WORKING AT HEIGHTS" in text.upper():
                    x, y, w, h = ocr_data['left'][i], ocr_data['top'][i], ocr_data['width'][i], ocr_data['height'][i]
                    
                    # Adjusted for right-side checkbox (modify these values as needed)
                    checkbox_x1 = x + w + 10  # Start 10px right of text
                    checkbox_x2 = checkbox_x1 + 40  # Checkbox width ~40px
                    checkbox_y1 = y - 5       # Slightly above text baseline
                    checkbox_y2 = y + h + 5   # Slightly below text height
                    
                    # Extract checkbox region
                    checkbox_roi = thresh[checkbox_y1:checkbox_y2, checkbox_x1:checkbox_x2]
                    
                    # Save visualization for debugging
                    debug_img = img.copy()
                    cv2.rectangle(debug_img, (checkbox_x1, checkbox_y1), (checkbox_x2, checkbox_y2), (0, 255, 0), 2)
                    cv2.imwrite(f"debug_page{page_num+1}.jpg", debug_img)
                    print(f"Debug image saved: debug_page{page_num+1}.jpg")
                    
                    # Analyze checkbox content
                    filled_pixels = cv2.countNonZero(checkbox_roi)
                    total_pixels = checkbox_roi.size
                    fill_percentage = filled_pixels / total_pixels
                    
                    # Determine checkbox state (adjust threshold as needed)
                    if fill_percentage > 0.25:  # 25% filled = checked
                        print("[✅] Checkbox DETECTED AS CHECKED")
                        return True
                    else:
                        print("[❌] Checkbox DETECTED AS UNCHECKED")
                        return False
                    
        print("[⚠️] 'WORKING AT HEIGHTS' text not found")
        return False
        
    except Exception as e:
        print(f"[🔥] Processing error: {str(e)}")
        return False


def parse_pdf_with_ai(pdf_text, checkbox_state=None):
    """Enhanced AI parser with checkbox awareness and refined name extraction"""
    
    prompt = f"""
You are analyzing a Job Hazard Analysis (JHA) form.

Please extract the following information in strict JSON format:

1. **Checkbox Status**:
   - Search for the section labeled "WORKING AT HEIGHTS" (in the hazard controls area)
   - Determine if it is **checked** (look for markers like [X], ☑, ✓) or **unchecked** ([ ], ☐, □)

2. **Personnel Data**:
   - Locate the section with the heading **"ON SITE PERSONS"**
   - After that, look for lines containing:
     - "NAME", followed by a full name in uppercase (e.g., "SAMIMI, SHERVIN")
     - Optionally followed by "NWSA" or an NWSA number (e.g., "2320005771")
   - Extract each name as a dictionary with:
     - "name": the full uppercase name
     - "nwsa_number": the associated number (or leave empty if missing)
   - Stop extracting when you reach the next unrelated section (e.g., "HAZARDS", "TOOLBOX TALK", etc.)
   - Count the total number of persons listed

3. Date:
   - Locate the "DATE" field or section.
   - Extract the date.
   - Format it as **MM/DD/YYYY** regardless of how it's originally written (e.g., "January 27, 2025" → "01/27/2025").


Use this JSON structure in your response:

{{
  "working_at_heights": true or false,
  "persons": [
    {{
      "name": "FULL NAME",
      "nwsa_number": "NUMBER or empty string"
    }},
    ...
  ],
  "total_persons": integer,
  "date": "MM/DD/YYYY"
}}

Current checkbox state (may override detection): {checkbox_state if checkbox_state is not None else "Not provided"}

--- BEGIN JHA DOCUMENT TEXT ---
{pdf_text[:15000]}
--- END TEXT ---
"""
    
    response = client.chat.completions.create(
        model="o4-mini",
        messages=[
            {"role": "system", "content": "You are a precise JHA form analyzer. First verify checkbox status, then extract personnel data as instructed."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"}
    )
    
    result = json.loads(response.choices[0].message.content)

    # Override checkbox state if given externally
    if checkbox_state is not None:
        result['working_at_heights'] = checkbox_state
    print(f"Checkbox state from extraction: {checkbox_state}")
    print(f"AI-detected working_at_heights: {result.get('working_at_heights')}")

    return result


def process_pdf_files():
    pdf_files = sorted(
        [f for f in os.listdir(PDF_DIR) if f.endswith('.pdf')],
        key=lambda x: datetime.strptime(x.split('.')[0], '%Y-%m-%d %H-%M-%S')
    )

    results = []
    text_output_dir = os.path.join(OUTPUT_DIR, 'extracted_texts')
    os.makedirs(text_output_dir, exist_ok=True)

    for pdf_file in pdf_files:
        date_str = pdf_file.split('.')[0]
        date = datetime.strptime(date_str, '%Y-%m-%d %H-%M-%S')
        pdf_path = os.path.join(PDF_DIR, pdf_file)

        # Extract text and checkbox
        pdf_text= extract_text_with_checkbox(pdf_path)
        checkbox_state = detect_working_at_heights_checked(pdf_path)


        # Save extracted text
        text_path = os.path.join(text_output_dir, f"{date_str}.txt")
        with open(text_path, 'w', encoding='utf-8') as f:
            f.write(pdf_text)

        # Parse via AI
        data = parse_pdf_with_ai(pdf_text, checkbox_state)

        print(f"\nPDF: {pdf_file}")
        print(f"Extracted Persons: {data['persons']}")
        formatted_date = date.strftime('%m/%d/%Y') 
        results.append({
            'date': date,
            'date_str': formatted_date,
            'working_at_heights': data['working_at_heights'],
            'persons': data['persons'],
            'total_persons': data['total_persons']
        })

    return sorted(results, key=lambda x: x['date'])


def update_excel_file(jha_data):
    excel_file = next(
        (f for f in os.listdir(EXCEL_TEMPLATE) if f.endswith(".xlsb") and not f.startswith("~$")),
        None
    )
    if not excel_file:
        raise FileNotFoundError(f"No Excel (.xlsb) file found in {EXCEL_TEMPLATE}")

    app = xw.App(visible=False)
    wb = app.books.open(os.path.join(EXCEL_TEMPLATE, excel_file))

    try:
        all_sheets = [sheet.name for sheet in wb.sheets]
        print(f"Available sheets: {all_sheets}")

        for day, data in enumerate(jha_data, start=1):
            possible_sheet_names = [
                f"Day {day}", f"DAY {day}", f"Day{day}",
                f"DAY{day}", f"Sheet{day}", f"JHA Day {day}"
            ]

            sheet_found = False
            for sheet_name in possible_sheet_names:
                if sheet_name in all_sheets:
                    sheet = wb.sheets[sheet_name]
                    sheet_found = True
                    print(f"\nUpdating {sheet_name} with {data['total_persons']} person(s):")

                    sheet.range('DATE').value = data['date_str']
                    sheet.range('DAY').value = day
                    sheet.range('HEIGHTS').value = 'YES' if data['working_at_heights'] else 'NO'
                    sheet.range('CREW_NUM').value = data['total_persons']

                    for i in range(1, 5):
                        sheet.range(f'NAME{i}').value = None
                        sheet.range(f'NWSA{i}').value = None

                    for i, person in enumerate(data['persons'][:4]):
                        name = person.get('name', '')
                        nwsa = person.get('nwsa_number', 'N/A')
                        sheet.range(f'NAME{i+1}').value = name
                        sheet.range(f'NWSA{i+1}').value = nwsa
                        print(f"  Inserted NAME{i+1}: {name}, NWSA{i+1}: {nwsa}")
                    break

            if not sheet_found:
                print(f"Warning: No sheet found for Day {day} (tried: {possible_sheet_names})")

        output_path = os.path.join(OUTPUT_DIR, 'jha_processed.xlsb')
        wb.save(output_path)
        print(f"\n✅ Excel file saved: {output_path}")
    finally:
        wb.close()
        app.quit()

def main():
    print("Starting JHA processing with enhanced checkbox detection...")
    jha_data = process_pdf_files()
    update_excel_file(jha_data)
    print("Processing complete!")

if __name__ == "__main__":
    main()