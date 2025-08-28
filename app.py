from flask import Flask
from views.main import main_bp
from views.pdf_merger import pdf_merger_bp
from views.pdf_splitter import pdf_splitter_bp
from views.pdf_compressor import pdf_compressor_bp

# Dosya temizleme
from views.file_cleaner import cleanup_uploads_folder
import threading

import os

app = Flask(__name__)

# Configuration
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['SECRET_KEY'] = os.urandom(24)

# Register Blueprints
app.register_blueprint(main_bp)
app.register_blueprint(pdf_merger_bp)
app.register_blueprint(pdf_splitter_bp)
app.register_blueprint(pdf_compressor_bp)

# Start background cleanup thread
cleanup_thread = threading.Thread(target=cleanup_uploads_folder, daemon=True)
cleanup_thread.start()

if __name__ == '__main__':
    app.run(debug=False)
