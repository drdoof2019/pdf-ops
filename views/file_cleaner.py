# views/file_cleaner.py
import os
import threading
import time

UPLOAD_FOLDER = 'uploads'

def cleanup_uploads_folder(interval_seconds=60, max_file_age_seconds=300):
    while True:
        now = time.time()
        for filename in os.listdir(UPLOAD_FOLDER):
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            try:
                if os.path.isfile(file_path):
                    file_age = now - os.path.getmtime(file_path)
                    if file_age > max_file_age_seconds:
                        os.remove(file_path)
                        print(f"Deleted old file: {file_path}")
            except Exception as e:
                print(f"Error deleting file {file_path}: {e}")
        time.sleep(interval_seconds)
