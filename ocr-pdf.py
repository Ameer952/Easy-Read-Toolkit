from pdf2image import convert_from_path
import pytesseract
from PIL import Image
import cv2
import numpy as np
import os

# Set Tesseract executable path
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

def preprocess_image(pil_img):
    """
    Convert PIL image to grayscale, enhance contrast, binarize, denoise, and sharpen for better OCR.
    """
    img = np.array(pil_img.convert("L"))  # grayscale

    # Enhance contrast
    img = cv2.equalizeHist(img)

    # Binarize using Otsu's method
    _, img = cv2.threshold(img, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Denoise
    img = cv2.medianBlur(img, 3)

    # Sharpening filter
    kernel = np.array([[0,-1,0],[-1,5,-1],[0,-1,0]])
    img = cv2.filter2D(img, -1, kernel)

    return Image.fromarray(img)

# Tesseract config
# --oem 3: Default OCR Engine
# --psm 4: Assume a single column of text (try 1 or 6 for different layouts)
custom_config = r'--oem 3 --psm 4'

# Path to PDF file
pdf_path = r"C:\Users\Nebula PC\ocr-easy-read\StayingSafe_NowYouAreHome_UPDATED.pdf"

# Path to Poppler bin folder
poppler_path = r"C:\Users\Nebula PC\Downloads\Release-25.07.0-0\poppler-25.07.0\Library\bin"

# Check if PDF exists
if not os.path.exists(pdf_path):
    raise FileNotFoundError(f"PDF not found at: {pdf_path}")

print("Starting OCR for PDF:", pdf_path)

# Convert PDF to images (increase DPI for better clarity)
pages = convert_from_path(pdf_path, dpi=400, poppler_path=poppler_path)
print(f"Total pages found: {len(pages)}")

# Create output folder if it doesn't exist
output_folder = os.path.join(os.getcwd(), "output")
os.makedirs(output_folder, exist_ok=True)

all_text = []  # collect text for combined file

for i, page in enumerate(pages, start=1):
    print(f"Processing page {i}...")

    # Preprocess page
    processed_page = preprocess_image(page)

    # OCR
    text = pytesseract.image_to_string(processed_page, config=custom_config, lang='eng+osd')

    # Print OCR result preview
    print(f"--- Page {i} OCR Done ---")
    print(text[:200], "...")  # first 200 chars

    # Save per-page text in output folder
    page_file = os.path.join(output_folder, f'page_{i}_ocr.txt')
    with open(page_file, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f"Saved OCR text to {page_file}")

    # Store in combined list
    all_text.append(f"--- Page {i} ---\n{text}")

# Save everything into one combined file in output folder
combined_file = os.path.join(output_folder, 'document_ocr.txt')
with open(combined_file, 'w', encoding='utf-8') as f:
    f.write("\n\n".join(all_text))

print(f"All pages OCR completed. Combined text saved to {combined_file}")
