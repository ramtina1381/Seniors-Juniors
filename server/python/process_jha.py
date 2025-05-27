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
import pytesseract
from PIL import Image



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
LOCATION = args.location
PDF_DIR = os.path.join(UPLOADS_ROOT, 'jha', LOCATION, 'pdfs')
EXCEL_TEMPLATE = os.path.join(UPLOADS_ROOT, 'jha', LOCATION, 'excel')
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'output', 'jha', LOCATION)
os.makedirs(OUTPUT_DIR, exist_ok=True)
OUTPUT_EXCEL = os.path.join(OUTPUT_DIR, "jha_processed.xlsx")
TIMEZONE = pytz.timezone('America/New_York')

def extract_text_with_checkboxes(pdf_path):
    from PyPDF2.errors import PdfReadError

    checkbox_state = None
    combined_text = ""

    try:
        with open(pdf_path, 'rb') as file:
            reader = PdfReader(file)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    combined_text += page_text

                # Check for digital checkboxes
                if "/Annots" in page:
                    for annot_ref in page["/Annots"]:
                        annot = annot_ref.get_object()
                        if annot.get("/Subtype") == "/Widget" and annot.get("/FT") == "/Btn":
                            field_name = annot.get("/T")
                            if field_name and "height" in str(field_name).lower():
                                checkbox_state = annot.get("/V") == "/Yes"
                                print(f"[✔] Digital checkbox found: {checkbox_state}")
                                return combined_text, checkbox_state
    except PdfReadError as e:
        print(f"PDF Read error: {e}")

    # OCR fallback
    print("[ℹ️] Falling back to OCR for checkbox detection...")
    images = convert_from_path(pdf_path, dpi=300)
    for img in images:
        ocr_text = pytesseract.image_to_string(img)
        combined_text += "\n" + ocr_text

        if "WORKING AT HEIGHTS" in ocr_text.upper():
            context = ocr_text.upper().split("WORKING AT HEIGHTS", 1)[-1][:100]
            if any(x in context for x in ['☑', '[X]', '✓', '✔', '[√]', '[V]', 'YES']):
                checkbox_state = True
                print("[✔] OCR: WORKING AT HEIGHTS is CHECKED.")
                break
            elif any(x in context for x in ['☐', '[ ]', 'NO', 'UNCHECKED']):
                checkbox_state = False
                print("[✘] OCR: WORKING AT HEIGHTS is NOT checked.")
                break

    return combined_text, checkbox_state

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
        pdf_text, checkbox_state = extract_text_with_checkboxes(pdf_path)

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