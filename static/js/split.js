document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileInfoContainer = document.getElementById('file-info-container');
    const selectedFileName = document.getElementById('selected-file-name');
    const totalPagesSpan = document.getElementById('total-pages');
    const splitOptionsDiv = document.getElementById('split-options');
    const splitAllPagesRadio = document.getElementById('splitAllPages');
    const splitCustomRangesRadio = document.getElementById('splitCustomRanges');
    const pageRangesInputDiv = document.getElementById('page-ranges-input');
    const pageRangesInput = document.getElementById('pageRanges');
    const splitBtn = document.getElementById('split-btn');
    const progressArea = document.getElementById('progress-area');
    const splitProgressBar = document.getElementById('split-progress-bar');
    const progressText = document.getElementById('progress-text');
    const downloadArea = document.getElementById('download-area');
    const downloadLinksList = document.getElementById('download-links-list');
    const errorArea = document.getElementById('error-area');
    const errorMessage = document.getElementById('error-message');
    const captchaArea = document.getElementById('captcha-area');
    const captchaQuestion = document.getElementById('captcha-question');
    const captchaInput = document.getElementById('captcha-input');

    let selectedFile = null;

    // Load CAPTCHA on page load
    loadCaptcha();

    async function loadCaptcha() {
        try {
            const response = await fetch('/api/captcha');
            const data = await response.json();
            if (response.ok) {
                captchaQuestion.textContent = data.question;
                captchaArea.style.display = 'block';
            } else {
                showError('Failed to load CAPTCHA. Please refresh the page.');
            }
        } catch (error) {
            showError('Failed to load CAPTCHA. Please check your network and refresh.');
        }
    }

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
        hideDownloadAndError();
        if (file && file.type === 'application/pdf') {
            selectedFile = file;
            selectedFileName.textContent = file.name;
            // For now, we don't know total pages on client-side without a PDF parser lib
            // This will be updated after server response if needed, or just left blank.
            totalPagesSpan.textContent = 'N/A'; // Placeholder
            fileInfoContainer.style.display = 'block';
            splitOptionsDiv.style.display = 'block';
            splitBtn.removeAttribute('disabled');
        } else {
            selectedFile = null;
            selectedFileName.textContent = '';
            totalPagesSpan.textContent = '';
            fileInfoContainer.style.display = 'none';
            splitOptionsDiv.style.display = 'none';
            splitBtn.setAttribute('disabled', 'disabled');
            showError('Please upload a valid PDF file.');
        }
    }

    // --- Split Options Logic ---
    splitAllPagesRadio.addEventListener('change', () => {
        pageRangesInputDiv.style.display = 'none';
    });

    splitCustomRangesRadio.addEventListener('change', () => {
        pageRangesInputDiv.style.display = 'block';
    });

    function hideDownloadAndError() {
        downloadArea.style.display = 'none';
        errorArea.style.display = 'none';
        progressArea.style.display = 'none';
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorArea.style.display = 'block';
    }

    // --- Split Button Click Handler ---
    splitBtn.addEventListener('click', async () => {
        if (!selectedFile) {
            showError('Please select a PDF file first.');
            return;
        }

        if (!captchaInput.value) {
            showError('Please solve the CAPTCHA before splitting.');
            return;
        }

        hideDownloadAndError();
        splitBtn.setAttribute('disabled', 'disabled');
        splitBtn.textContent = 'Splitting...';
        progressArea.style.display = 'block';
        splitProgressBar.style.width = '0%';
        splitProgressBar.classList.add('progress-bar-animated');
        progressText.textContent = 'Splitting your PDF...';

        const formData = new FormData();
        formData.append('file', selectedFile);

        const splitOption = document.querySelector('input[name="splitOption"]:checked').value;
        formData.append('split_option', splitOption);

        if (splitOption === 'custom_ranges') {
            const pageRanges = pageRangesInput.value.trim();
            if (!pageRanges) {
                showError('Please enter page ranges for custom split.');
                splitBtn.removeAttribute('disabled');
                splitBtn.textContent = 'Split PDF';
                progressArea.style.display = 'none';
                return;
            }
            formData.append('page_ranges', pageRanges);
        }

        // Append CAPTCHA answer
        formData.append('captcha_answer', captchaInput.value);

        try {
            const response = await fetch('/api/split', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                downloadLinksList.innerHTML = ''; // Clear previous links
                data.download_urls.forEach(url => {
                    const listItem = document.createElement('li');
                    listItem.classList.add('list-group-item');
                    const link = document.createElement('a');
                    link.href = url;
                    link.textContent = url.split('/').pop(); // Display filename
                    link.download = url.split('/').pop(); // Suggest filename for download
                    link.classList.add('btn', 'btn-sm', 'btn-outline-success', 'm-1');
                    listItem.appendChild(link);
                    downloadLinksList.appendChild(listItem);
                });
                downloadArea.style.display = 'block';
                splitProgressBar.style.width = '100%';
                splitProgressBar.classList.remove('progress-bar-animated');
                progressText.textContent = 'Split complete!';
                setTimeout(() => {
                    progressArea.style.display = 'none';
                }, 3000);

            } else {
                showError(data.error || 'An unknown error occurred.');
                progressArea.style.display = 'none';
                // If CAPTCHA was wrong, load a new one
                if (data.error && data.error.toLowerCase().includes('captcha')) {
                    captchaInput.value = '';
                    loadCaptcha();
                }
            }
        } catch (error) {
            showError('Network error or server is unreachable. Check console for details.');
            progressArea.style.display = 'none';
        } finally {
            splitBtn.removeAttribute('disabled');
            splitBtn.textContent = 'Split PDF';
        }
    });
});
