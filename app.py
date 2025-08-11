from flask import Flask
from views.main import main_bp
from views.pdf_merger import pdf_merger_bp
from views.pdf_splitter import pdf_splitter_bp # Import the new blueprint
from views.pdf_compressor import pdf_compressor_bp
import os

app = Flask(__name__)

# Configuration
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['SECRET_KEY'] = os.urandom(24)

# Register Blueprints
app.register_blueprint(main_bp)
app.register_blueprint(pdf_merger_bp)
app.register_blueprint(pdf_splitter_bp) # Register the new blueprint
app.register_blueprint(pdf_compressor_bp)


if __name__ == '__main__':
    app.run(debug=True)
