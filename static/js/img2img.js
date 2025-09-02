document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileList = document.getElementById('file-list');
    const fileListContainer = document.getElementById('file-list-container');
    const convertBtn = document.getElementById('convert-btn');
    const formatSelect = document.getElementById('output-format');
    const progressArea = document.getElementById('progress-area');
    const progressBar = document.getElementById('convert-progress-bar');
    const progressText = document.getElementById('progress-text');
    const downloadArea = document.getElementById('download-area');
    const downloadLinksList = document.getElementById('download-links-list');
    const errorArea = document.getElementById('error-area');
    const errorMessage = document.getElementById('error-message');
    const captchaArea = document.getElementById('captcha-area');
    const captchaQuestion = document.getElementById('captcha-question');
    const captchaInput = document.getElementById('captcha-input');

    let uploadedFiles = [];

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

    // --- Drop zone events ---
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('hover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('hover'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('hover');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', e => handleFiles(e.target.files));

    function handleFiles(files) {
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                if (uploadedFiles.length < 25) {
                    uploadedFiles.push(file);
                } else {
                    showError('You can upload a maximum of 25 images.');
                }
            } else {
                showError(`File '${file.name}' is not an image.`);
            }
        }
        renderFileList();
        updateConvertButton();
    }

    function renderFileList() {
        fileList.innerHTML = '';
        if (uploadedFiles.length > 0) {
            fileListContainer.style.display = 'block';
            uploadedFiles.forEach((file, idx) => {
                const li = document.createElement('li');
                li.classList.add('list-group-item', 'file-item');
                li.innerHTML = `
                    <span>${file.name}</span>
                    <button type="button" class="remove-btn" data-index="${idx}">&times;</button>
                `;
                fileList.appendChild(li);
            });
        } else {
            fileListContainer.style.display = 'none';
        }
    }

    fileList.addEventListener('click', e => {
        if (e.target.classList.contains('remove-btn')) {
            const idx = e.target.dataset.index;
            uploadedFiles.splice(idx, 1);
            renderFileList();
            updateConvertButton();
        }
    });

    function updateConvertButton() {
        convertBtn.disabled = uploadedFiles.length === 0;
        hideMessages();
    }

    function hideMessages() {
        progressArea.style.display = 'none';
        downloadArea.style.display = 'none';
        errorArea.style.display = 'none';
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        errorArea.style.display = 'block';
    }

    convertBtn.addEventListener('click', async () => {
        if (uploadedFiles.length === 0) return;

        if (!captchaInput.value) {
            showError('Please solve the CAPTCHA before converting.');
            return;
        }

        hideMessages();
        convertBtn.disabled = true;
        convertBtn.textContent = 'Converting...';
        progressArea.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = 'Converting your images...';

        const formData = new FormData();
        uploadedFiles.forEach(f => formData.append('files[]', f));
        formData.append('format', formatSelect.value);
        formData.append('captcha_answer', captchaInput.value);

        try {
            const response = await fetch('/api/img2img', { method: 'POST', body: formData });
            const data = await response.json();

            if (response.ok) {
                downloadLinksList.innerHTML = '';
                data.download_urls.forEach(url => {
                    const li = document.createElement('li');
                    li.classList.add('list-group-item');
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = url.split('/').pop();
                    link.textContent = link.download;
                    link.classList.add('btn', 'btn-sm', 'btn-outline-success');
                    li.appendChild(link);
                    downloadLinksList.appendChild(li);
                });
                downloadArea.style.display = 'block';
                progressBar.style.width = '100%';
                progressText.textContent = 'Conversion complete!';
            } else {
                showError(data.error || 'Conversion failed.');
                if (data.error && data.error.toLowerCase().includes('captcha')) {
                    captchaInput.value = '';
                    loadCaptcha();
                }
            }
        } catch (err) {
            showError('Network error.');
        } finally {
            convertBtn.disabled = false;
            convertBtn.textContent = 'Convert Images';
        }
    });
});
