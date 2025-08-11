import os
import fitz  # PyMuPDF
from flask import Blueprint, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import uuid
from PIL import Image
import io

pdf_compressor_bp = Blueprint('pdf_compressor_bp', __name__)

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@pdf_compressor_bp.route('/compress')
def compress_page():
    return render_template('compress.html')

@pdf_compressor_bp.route('/api/compress', methods=['POST'])
def compress_pdf():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400

        file = request.files['file']
        compression_level = request.form.get('level', 'medium')

        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        if file and file.filename.lower().endswith('.pdf'):
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4()}_{filename}"
            input_path = os.path.join(UPLOAD_FOLDER, unique_filename)
            file.save(input_path)

            input_size = os.path.getsize(input_path)
            print(f"Original file size: {input_size} bytes")

            output_filename = f"compressed_{uuid.uuid4()}.pdf"
            output_path = os.path.join(UPLOAD_FOLDER, output_filename)

            doc = fitz.open(input_path)

            if compression_level != 'low':
                quality = 0
                if compression_level == 'medium':
                    quality = 75
                elif compression_level == 'high':
                    quality = 50
                elif compression_level == 'ultra_high':
                    quality = 25

                for page_num in range(len(doc)):
                    page = doc[page_num]
                    images = page.get_images(full=True)
                    for img_index, img in enumerate(images):
                        xref = img[0]
                        base_image = doc.extract_image(xref)
                        image_bytes = base_image["image"]
                        
                        img = Image.open(io.BytesIO(image_bytes))
                        
                        if img.mode == 'RGBA':
                            img = img.convert('RGB')

                        img_byte_arr = io.BytesIO()
                        img.save(img_byte_arr, format='JPEG', quality=quality)
                        img_byte_arr = img_byte_arr.getvalue()

                        page.replace_image(xref, stream=img_byte_arr)

            doc.save(output_path, garbage=4, deflate=True, clean=True)
            doc.close()

            output_size = os.path.getsize(output_path)
            print(f"Compressed file size: {output_size} bytes")

            os.remove(input_path)

            return jsonify({'download_url': f'/uploads/{output_filename}'})
        else:
            return jsonify({'error': 'Invalid file type. Please upload a PDF.'}), 400

    except Exception as e:
        print(f"Error during PDF compression: {e}")
        return jsonify({'error': f'An internal error occurred during the compression process: {str(e)}'}), 500

@pdf_compressor_bp.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=True)
