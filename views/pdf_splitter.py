import os
from flask import Blueprint, render_template, request, jsonify, send_from_directory, session
from pypdf import PdfReader, PdfWriter
from werkzeug.utils import secure_filename
import uuid

pdf_splitter_bp = Blueprint('pdf_splitter_bp', __name__)

UPLOAD_FOLDER = 'uploads' # Re-use the same upload folder
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@pdf_splitter_bp.route('/split')
def split_page():
    return render_template('split.html')

@pdf_splitter_bp.route('/api/split', methods=['POST'])
def split_pdf():
    temp_file_path = None
    try:
        # --- CAPTCHA Verification ---
        user_answer = request.form.get('captcha_answer')
        correct_answer = session.pop('captcha_answer', None)

        if correct_answer is None:
            return jsonify({'error': 'CAPTCHA session expired. Please refresh.'}), 400
        
        try:
            if int(user_answer) != correct_answer:
                return jsonify({'error': 'Invalid CAPTCHA answer.'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid CAPTCHA format.'}), 400
        # --- End CAPTCHA Verification ---

        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Invalid file type. Only PDF files are allowed.'}), 400

        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        temp_file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(temp_file_path)

        reader = PdfReader(temp_file_path)
        total_pages = len(reader.pages)

        split_option = request.form.get('split_option')
        page_ranges_str = request.form.get('page_ranges', '')

        output_files = []

        if split_option == 'all_pages':
            for i in range(total_pages):
                writer = PdfWriter()
                writer.add_page(reader.pages[i])
                output_filename = f"{os.path.splitext(filename)[0]}_page_{i+1}.pdf"
                output_unique_filename = f"{uuid.uuid4()}_{output_filename}"
                output_path = os.path.join(UPLOAD_FOLDER, output_unique_filename)
                writer.write(output_path)
                writer.close()
                output_files.append(f'/uploads/{output_unique_filename}')
        elif split_option == 'custom_ranges' and page_ranges_str:
            # Example: "1-3, 5, 7-9"
            ranges = page_ranges_str.split(',')
            for r_str in ranges:
                r_str = r_str.strip()
                writer = PdfWriter()
                try:
                    if '-' in r_str:
                        start, end = map(int, r_str.split('-'))
                        for i in range(start - 1, end):
                            if 0 <= i < total_pages:
                                writer.add_page(reader.pages[i])
                    else:
                        page_num = int(r_str)
                        if 0 <= page_num - 1 < total_pages:
                            writer.add_page(reader.pages[page_num - 1])
                    
                    if len(writer.pages) > 0:
                        output_filename = f"{os.path.splitext(filename)[0]}_split_{r_str.replace('-', '_')}.pdf"
                        output_unique_filename = f"{uuid.uuid4()}_{output_filename}"
                        output_path = os.path.join(UPLOAD_FOLDER, output_unique_filename)
                        writer.write(output_path)
                        writer.close()
                        output_files.append(f'/uploads/{output_unique_filename}')
                    else:
                        print(f"Warning: No pages added for range {r_str}")

                except ValueError:
                    print(f"Invalid page range format: {r_str}")
                    continue # Skip invalid range
                except IndexError:
                    print(f"Page number out of bounds for range: {r_str}")
                    continue # Skip out of bounds page

        if not output_files:
            return jsonify({'error': 'No PDF files were generated. Check your split options.'}), 400

        return jsonify({'download_urls': output_files})

    except Exception as e:
        print(f"Error during PDF split: {e}")
        return jsonify({'error': f'An internal error occurred during the split process: {str(e)}'}), 500
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except OSError as e:
                print(f"Error deleting temporary input file {temp_file_path}: {e}")
