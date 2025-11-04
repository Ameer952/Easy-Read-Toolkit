import argparse
import os
import sys
from pdf2image import convert_from_path
import pytesseract
from PIL import Image
import cv2
import numpy as np

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
    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    img = cv2.filter2D(img, -1, kernel)

    return Image.fromarray(img)

def build_config(oem, psm):
    return f'--oem {oem} --psm {psm}'

def main():
    parser = argparse.ArgumentParser(description="OCR PDF to text using Tesseract with preprocessing")
    parser.add_argument("--pdf", required=True, help="Path to input PDF")
    parser.add_argument("--poppler-path", default=None, help="Optional Poppler bin folder path")
    parser.add_argument("--tesseract-cmd", default=None, help="Optional path to tesseract executable")
    parser.add_argument("--output", default=None, help="Optional output file path (if not set, prints to stdout)")
    parser.add_argument("--dpi", type=int, default=400, help="DPI used when converting PDF to images")
    parser.add_argument("--lang", default="eng", help="Tesseract language(s), e.g. 'eng' or 'eng+osd'")
    parser.add_argument("--oem", type=int, default=3, help="Tesseract OEM (default 3)")
    parser.add_argument("--psm", type=int, default=4, help="Tesseract PSM (default 4)")
    parser.add_argument("--save-pages", action="store_true", help="Save per-page text files into ./output (optional)")
    args = parser.parse_args()

    if args.tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = args.tesseract_cmd
    else:
        # If environment variable provided, prefer it
        if os.environ.get("TESSERACT_CMD"):
            pytesseract.pytesseract.tesseract_cmd = os.environ["TESSERACT_CMD"]

    pdf_path = args.pdf
    poppler_path = args.poppler_path

    if not os.path.exists(pdf_path):
        print(f"ERROR: PDF not found at: {pdf_path}", file=sys.stderr)
        sys.exit(2)

    print(f"Starting OCR for PDF: {pdf_path}", file=sys.stderr)

    # Convert PDF to images
    try:
        if poppler_path:
            pages = convert_from_path(pdf_path, dpi=args.dpi, poppler_path=poppler_path)
        else:
            pages = convert_from_path(pdf_path, dpi=args.dpi)
    except Exception as e:
        print("ERROR: failed to convert PDF to images:", e, file=sys.stderr)
        sys.exit(3)

    print(f"Total pages found: {len(pages)}", file=sys.stderr)

    output_folder = os.path.join(os.getcwd(), "output")
    if args.save_pages:
        os.makedirs(output_folder, exist_ok=True)

    all_text = []
    custom_config = build_config(args.oem, args.psm)

    for i, page in enumerate(pages, start=1):
        print(f"Processing page {i}...", file=sys.stderr)

        processed_page = preprocess_image(page)

        try:
            text = pytesseract.image_to_string(processed_page, config=custom_config, lang=args.lang)
        except Exception as e:
            print(f"ERROR: tesseract failed on page {i}: {e}", file=sys.stderr)
            text = ""

        print(f"--- Page {i} OCR Done ---", file=sys.stderr)
        print(text[:200] + ("..." if len(text) > 200 else ""), file=sys.stderr)

        if args.save_pages:
            page_file = os.path.join(output_folder, f'page_{i}_ocr.txt')
            try:
                with open(page_file, 'w', encoding='utf-8') as f:
                    f.write(text)
                print(f"Saved OCR text to {page_file}", file=sys.stderr)
            except Exception as e:
                print(f"WARNING: failed to save page {i} text: {e}", file=sys.stderr)

        all_text.append(f"--- Page {i} ---\n{text}")

    combined = "\n\n".join(all_text)

    if args.output:
        try:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(combined)
            print(f"Combined text saved to {args.output}", file=sys.stderr)
        except Exception as e:
            print(f"ERROR: failed to write output file: {e}", file=sys.stderr)
            sys.exit(4)
    else:
        # Print combined text to stdout for calling process (e.g. Node)
        print(combined)

if __name__ == "__main__":
    main()
