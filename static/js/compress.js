document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileList = document.getElementById('file-list');
    const fileListContainer = document.getElementById('file-list-container');
    const compressBtn = document.getElementById('compress-btn');
    const compressionLevel = document.getElementById('compression-level');
    const downloadArea = document.getElementById('download-area');
    const downloadLink = document.getElementById('download-link');
    const errorArea = document.getElementById('error-area');
    const errorMessage = document.getElementById('error-message');
    const progressArea = document.getElementById('progress-area');
    const compressProgressBar = document.getElementById('compress-progress-bar');
    const progressText = document.getElementById('progress-text');

    let uploadedFile = null; // Stores the single File object

    // --- Event Listeners for Drop Zone ---
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('hover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('hover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('hover');
        handleFile(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        handleFile(e.target.files[0]);
    });

    function handleFile(file) {
        if (file) {
            if (file.type === 'application/pdf') {
                uploadedFile = file;
                renderFileList();
            } else {
                showError(`File '${file.name}' is not a PDF.`);
                uploadedFile = null;
            }
        }
        updateCompressButtonState();
    }

    function renderFileList() {
        fileList.innerHTML = ''; // Clear existing list
        if (uploadedFile) {
            fileListContainer.style.display = 'block';
            const listItem = document.createElement('li');
            listItem.classList.add('list-group-item', 'file-item');
            listItem.innerHTML = `
                <span>${uploadedFile.name}</span>
                <button type="button" class="remove-btn">&times;</button>
            `;
            fileList.appendChild(listItem);
        } else {
            fileListContainer.style.display = 'none';
        }
    }

    // Handle removing the file from the list
    fileList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-btn')) {
            uploadedFile = null;
            renderFileList();
            updateCompressButtonState();
        }
    });

    function updateCompressButtonState() {
        if (uploadedFile) {
            compressBtn.removeAttribute('disabled');
        } else {
            compressBtn.setAttribute('disabled', 'disabled');
        }
        hideDownloadAndError();
    }

    function hideDownloadAndError() {
        downloadArea.style.display = 'none';
        errorArea.style.display = 'none';
        progressArea.style.display = 'none';
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorArea.style.display = 'block';
        progressArea.style.display = 'none';
    }

    // --- Compress Button Click Handler ---
    compressBtn.addEventListener('click', async () => {
        if (!uploadedFile) return;

        hideDownloadAndError();
        compressBtn.setAttribute('disabled', 'disabled');
        compressBtn.textContent = 'Compressing...';
        progressArea.style.display = 'block';
        compressProgressBar.style.width = '0%';
        compressProgressBar.classList.add('progress-bar-animated');
        progressText.textContent = 'Compressing your PDF...';

        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('level', compressionLevel.value);

        try {
            const response = await fetch('/api/compress', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                downloadLink.href = data.download_url;
                downloadArea.style.display = 'block';
                compressProgressBar.style.width = '100%';
                compressProgressBar.classList.remove('progress-bar-animated');
                progressText.textContent = 'Compression complete!';
                setTimeout(() => {
                    progressArea.style.display = 'none';
                }, 3000);
            } else {
                showError(data.error || 'An unknown error occurred.');
            }
        } catch (error) {
            showError('Network error or server is unreachable.');
        } finally {
            compressBtn.removeAttribute('disabled');
            compressBtn.textContent = 'Compress PDF';
        }
    });
});
