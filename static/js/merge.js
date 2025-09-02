document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileList = document.getElementById('file-list');
    const fileListContainer = document.getElementById('file-list-container');
    const mergeBtn = document.getElementById('merge-btn');
    const downloadArea = document.getElementById('download-area');
    const downloadLink = document.getElementById('download-link');
    const errorArea = document.getElementById('error-area');
    const errorMessage = document.getElementById('error-message');
    const progressArea = document.getElementById('progress-area');
    const mergeProgressBar = document.getElementById('merge-progress-bar');
    const progressText = document.getElementById('progress-text');
    const captchaArea = document.getElementById('captcha-area');
    const captchaQuestion = document.getElementById('captcha-question');
    const captchaInput = document.getElementById('captcha-input');

    let uploadedFiles = []; // Stores File objects

    // Load CAPTCHA on page load
    loadCaptcha();

    // Initialize SortableJS
    const sortable = Sortable.create(fileList, {
        animation: 150,
        ghostClass: 'blue-background-class'
    });

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
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    function handleFiles(files) {
        for (const file of files) {
            if (file.type === 'application/pdf') {
                // Check if file with same name already exists
                if (!uploadedFiles.some(f => f.name === file.name)) {
                    uploadedFiles.push(file);
                    renderFileList();
                } else {
                    showError(`File '${file.name}' has already been added.`);
                }
            } else {
                showError(`File '${file.name}' is not a PDF and was skipped.`);
            }
        }
        updateMergeButtonState();
    }

    function renderFileList() {
        fileList.innerHTML = ''; // Clear existing list
        if (uploadedFiles.length > 0) {
            fileListContainer.style.display = 'block';
            uploadedFiles.forEach(file => {
                const listItem = document.createElement('li');
                listItem.classList.add('list-group-item', 'file-item');
                listItem.setAttribute('data-filename', file.name); // Store original filename
                listItem.innerHTML = `
                    <span>${file.name}</span>
                    <button type="button" class="remove-btn">&times;</button>
                `;
                fileList.appendChild(listItem);
            });
        } else {
            fileListContainer.style.display = 'none';
        }
    }

    // Handle removing files from the list
    fileList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-btn')) {
            const listItem = e.target.closest('.file-item');
            const filenameToRemove = listItem.getAttribute('data-filename');
            uploadedFiles = uploadedFiles.filter(file => file.name !== filenameToRemove);
            renderFileList();
            updateMergeButtonState();
        }
    });

    function updateMergeButtonState() {
        if (uploadedFiles.length > 0) {
            mergeBtn.removeAttribute('disabled');
        } else {
            mergeBtn.setAttribute('disabled', 'disabled');
        }
        hideDownloadAndError();
    }

    function hideDownloadAndError() {
        downloadArea.style.display = 'none';
        errorArea.style.display = 'none';
        progressArea.style.display = 'none'; // Hide progress area too
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorArea.style.display = 'block';
    }

    // --- Merge Button Click Handler ---
    mergeBtn.addEventListener('click', async () => {
        if (!captchaInput.value) {
            showError('Please solve the CAPTCHA before merging.');
            return;
        }

        hideDownloadAndError();
        mergeBtn.setAttribute('disabled', 'disabled');
        mergeBtn.textContent = 'Merging...'; // Simpler text for button
        progressArea.style.display = 'block'; // Show progress area
        mergeProgressBar.style.width = '0%'; // Reset progress bar
        mergeProgressBar.classList.add('progress-bar-animated'); // Ensure animation
        progressText.textContent = 'Merging your PDFs...';

        const formData = new FormData();

        // Get the current order of files from the DOM
        const currentOrder = Array.from(fileList.children).map(item => item.getAttribute('data-filename'));

        // Append files and their order to FormData
        uploadedFiles.forEach(file => {
            formData.append('files[]', file, file.name); // Use original filename for backend mapping
        });

        currentOrder.forEach(filename => {
            formData.append('order[]', filename);
        });

        // Append CAPTCHA answer
        formData.append('captcha_answer', captchaInput.value);

        try {
            const response = await fetch('/api/merge', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                downloadLink.href = data.download_url;
                downloadArea.style.display = 'block';
                mergeProgressBar.style.width = '100%'; // Set to 100% on success
                mergeProgressBar.classList.remove('progress-bar-animated'); // Stop animation
                progressText.textContent = 'Merge complete!';
                setTimeout(() => {
                    progressArea.style.display = 'none';
                }, 3000); // Hide after 3 seconds

            } else {
                showError(data.error || 'An unknown error occurred.');
                progressArea.style.display = 'none'; // Hide progress on error
                // If CAPTCHA was wrong, load a new one
                if (data.error && data.error.toLowerCase().includes('captcha')) {
                    captchaInput.value = '';
                    loadCaptcha();
                }
            }
        } catch (error) {
            showError('Network error or server is unreachable. Check console for details.');
            progressArea.style.display = 'none'; // Hide progress on error
        } finally {
            mergeBtn.removeAttribute('disabled');
            mergeBtn.textContent = 'Merge PDFs';
        }
    });
});
