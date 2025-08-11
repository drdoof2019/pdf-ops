import os
from flask import Blueprint, render_template, request, jsonify, send_from_directory
from pypdf import PdfWriter
from werkzeug.utils import secure_filename
import uuid

pdf_merger_bp = Blueprint('pdf_merger_bp', __name__)

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@pdf_merger_bp.route('/merge')
def merge_page():
    return render_template('merge.html')

@pdf_merger_bp.route('/api/merge', methods=['POST'])
def merge_pdfs():
    temp_files = {} # Initialize here
    merger = None # Initialize merger here

    try:
        if 'files[]' not in request.files:
            return jsonify({'error': 'No files part'}), 400

        files = request.files.getlist('files[]')
        file_order = request.form.getlist('order[]')

        if not files or not file_order:
            return jsonify({'error': 'No files or file order received'}), 400

        merger = PdfWriter()

        # Save files and create a map of original name to saved path
        for f in files:
            if f.filename and f.filename.lower().endswith('.pdf'):
                filename = secure_filename(f.filename)
                unique_filename = f"{uuid.uuid4()}_{filename}"
                file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
                f.save(file_path)
                temp_files[f.filename] = file_path
            else:
                print(f"Skipping non-PDF or invalid file: {f.filename}") # Log invalid files

        # Append files to the merger in the specified order
        for filename in file_order:
            if filename in temp_files:
                merger.append(temp_files[filename])
            else:
                print(f"Warning: File '{filename}' was in the order but not found in uploaded files or was invalid.")

        if len(merger.pages) == 0:
            return jsonify({'error': 'No valid PDF files were provided to merge.'}), 400

        output_filename = f"merged_{uuid.uuid4()}.pdf"
        output_path = os.path.join(UPLOAD_FOLDER, output_filename)
        merger.write(output_path)
        # merger.close() # Moved to finally block

        return jsonify({'download_url': f'/uploads/{output_filename}'})

    except Exception as e:
        print(f"Error during PDF merge: {e}") # Log the actual error
        return jsonify({'error': f'An internal error occurred during the merge process: {str(e)}'}), 500
    finally:
        if merger: # Ensure merger is closed if it was initialized
            merger.close()
        # Clean up the individual uploaded files
        for path in temp_files.values():
            try:
                os.remove(path)
            except OSError as e:
                print(f"Error deleting temporary file {path}: {e}")


@pdf_merger_bp.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=True)
