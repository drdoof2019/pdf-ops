import os
import io
import uuid
import zipfile
from flask import Blueprint, render_template, request, jsonify, send_from_directory, session
from werkzeug.utils import secure_filename
from PIL import Image

img_converter_bp = Blueprint('img_converter_bp', __name__)

UPLOAD_FOLDER = "uploads"
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.bmp', '.gif', '.webp'}


def allowed_file(filename):
    return '.' in filename and filename.lower().endswith(tuple(ALLOWED_EXTENSIONS))


# ---------- HTML PAGES ----------
@img_converter_bp.route("/img2img")
def img2img_page():
    return render_template("img2img.html")


@img_converter_bp.route("/img2pdf")
def img2pdf_page():
    return render_template("img2pdf.html")


# ---------- API ENDPOINTS ----------
@img_converter_bp.route("/api/img2img", methods=["POST"])
def api_img2img():
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

        if "files[]" not in request.files:
            return jsonify({"error": "No files part"}), 400

        files = request.files.getlist("files[]")
        output_format = request.form.get("format", "jpg").lower()

        if output_format not in ["jpg", "png", "webp"]:
            return jsonify({"error": "Invalid output format"}), 400

        if not files:
            return jsonify({"error": "No files uploaded"}), 400
        if len(files) > 25:
            return jsonify({"error": "Maximum 25 images allowed"}), 400

        zip_filename = f"converted_images_{uuid.uuid4()}.zip"
        zip_path = os.path.join(UPLOAD_FOLDER, zip_filename)

        with zipfile.ZipFile(zip_path, "w") as zipf:
            for idx, file in enumerate(files, start=1):
                if file and allowed_file(file.filename):
                    base_filename, _ = os.path.splitext(secure_filename(file.filename))
                    img = Image.open(file.stream)

                    # Handle transparency
                    if (output_format == "jpg" or output_format == "jpeg") and img.mode == "RGBA":
                        img = img.convert("RGB")

                    new_filename = f"{base_filename}.{output_format}"
                    img_byte_arr = io.BytesIO()
                    
                    save_format = "JPEG" if output_format == "jpg" else output_format.upper()
                    
                    if save_format == "JPEG":
                        img.save(img_byte_arr, format=save_format, quality=90)
                    else:
                        img.save(img_byte_arr, format=save_format)

                    img_byte_arr.seek(0)
                    zipf.writestr(new_filename, img_byte_arr.read())

        return jsonify({"download_urls": [f"/uploads/{zip_filename}"]})

    except Exception as e:
        print(f"Error in /api/img2img: {e}")
        return jsonify({"error": f"Internal error: {str(e)}"}), 500


@img_converter_bp.route("/api/img2pdf", methods=["POST"])
def api_img2pdf():
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

        if "files[]" not in request.files:
            return jsonify({"error": "No files part"}), 400

        files = request.files.getlist("files[]")

        if not files:
            return jsonify({"error": "No files uploaded"}), 400
        if len(files) > 25:
            return jsonify({"error": "Maximum 25 images allowed"}), 400

        images = []
        for file in files:
            if file and allowed_file(file.filename):
                img = Image.open(file.stream)
                if img.mode == "RGBA":
                    img = img.convert("RGB")
                images.append(img)

        if not images:
            return jsonify({"error": "No valid images uploaded"}), 400

        output_filename = f"converted_{uuid.uuid4()}.pdf"
        output_path = os.path.join(UPLOAD_FOLDER, output_filename)

        images[0].save(
            output_path,
            save_all=True,
            append_images=images[1:],
            format="PDF",
            quality=90
        )

        return jsonify({"download_url": f"/uploads/{output_filename}"})

    except Exception as e:
        print(f"Error in /api/img2pdf: {e}")
        return jsonify({"error": f"Internal error: {str(e)}"}), 500


# ---------- DOWNLOAD ----------
@img_converter_bp.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=True)
