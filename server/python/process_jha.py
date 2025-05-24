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
os.makedirs(OUTPUT_DIR, exist_ok=True)  # Ensure the directory exists
OUTPUT_EXCEL = os.path.join(OUTPUT_DIR, "jha_processed.xlsx")
TIMEZONE = pytz.timezone('America/New_York')

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF file"""
    with open(pdf_path, 'rb') as file:
        reader = PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text()
    return text

def parse_pdf_with_ai(pdf_text):
    """Use AI to extract structured data from PDF text"""
    prompt = f"""
    Extract the following information from this JHA document:
    
    1. Under "JOB SITE WORK/HAZARD IDENTIFICATION AND CONTROLS":
       - Is "Working at heights" checked? (True/False)
    
    2. Under "ON SITE PERSONS":
       - List all names with their NWSA certification numbers (if available)
       - Count of total persons
    
    Return as JSON with these keys:
    - working_at_heights (boolean)
    - persons (list of dicts with name, nwsa_number)
    - total_persons (integer)
    
    Document text:
    {pdf_text}
    """
    
    response = client.chat.completions.create(
        model="o4-mini",
        messages=[
            {"role": "system", "content": "You are a JHA document parser. Extract structured data."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"}
        )
    
    return json.loads(response.choices[0].message.content)

def process_pdf_files():
    """Process all PDF files in date-time order"""
    pdf_files = sorted(
        [f for f in os.listdir(PDF_DIR) if f.endswith('.pdf')],
        key=lambda x: datetime.strptime(x.split('.')[0], '%Y-%m-%d %H-%M-%S')
    )
    
    results = []
    for pdf_file in pdf_files:
        date_str = pdf_file.split('.')[0]
        date = datetime.strptime(date_str, '%Y-%m-%d %H-%M-%S')
        
        pdf_path = os.path.join(PDF_DIR, pdf_file)
        pdf_text = extract_text_from_pdf(pdf_path)
        data = parse_pdf_with_ai(pdf_text)
        
        results.append({
            'date': date,
            'date_str': date_str,
            'working_at_heights': data['working_at_heights'],
            'persons': data['persons'],
            'total_persons': data['total_persons']
        })
    
    return sorted(results, key=lambda x: x['date'])

def update_excel_file(jha_data):
    excel_dir = EXCEL_TEMPLATE
    excel_file = None

    for file in os.listdir(excel_dir):
        if file.endswith(".xlsb") and not file.startswith("~$"):
            excel_file = os.path.join(excel_dir, file)
            break

    if not excel_file:
        raise FileNotFoundError(f"No Excel (.xlsb) file found in directory: {excel_dir}")

    # Open workbook with xlwings (preserves xlsb format and macros)
    app = xw.App(visible=False)
    wb = app.books.open(excel_file)

    try:
        for day, data in enumerate(jha_data, start=1):
            sheet_name = f"Day {day}"
            try:
                sheet = wb.sheets[sheet_name]
            except Exception as e:
                print(f"Warning: Sheet '{sheet_name}' not found. Skipping.")
                continue

            # Update values (adjust cell positions based on your actual template layout)
            sheet.range('B1').value = data['date_str']  # Adjust cell address accordingly
            sheet.range('B2').value = 'YES' if data['working_at_heights'] else 'NO'
            sheet.range('B3').value = data['total_persons']

            # Start inserting person data at row 5
            start_row = 5
            for i, person in enumerate(data['persons']):
                sheet.range(f'A{start_row + i}').value = person['name']
                sheet.range(f'B{start_row + i}').value = person.get('nwsa_number', 'N/A')

        # Save back to same .xlsb file
        wb.save()
        print(f"Updated Excel file saved to: {excel_file}")
    finally:
        wb.close()
        app.quit()

def main():
    print("Starting JHA processing...")
    
    # Step 1: Process all PDF files
    print("Processing PDF files...")
    jha_data = process_pdf_files()
    
    # Step 2: Update Excel template
    print("Updating Excel file...")
    update_excel_file(jha_data)
    
    print(f"Processing complete! Output saved to {OUTPUT_EXCEL}")

if __name__ == "__main__":
    main()