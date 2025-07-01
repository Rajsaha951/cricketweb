document.addEventListener('DOMContentLoaded', () => {
  const API_BASE_URL = 'http://localhost:3001';
  const memeGrid = document.getElementById('memeGrid');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const uploadBtn = document.getElementById('uploadBtn');
  const uploadModal = document.getElementById('uploadModal');
  const closeModal = document.getElementById('closeModal');
  const memeUploadForm = document.getElementById('memeUploadForm');
  const filePreview = document.getElementById('filePreview');
  const memeFileInput = document.getElementById('memeFile');
  const memeCaptionInput = document.getElementById('memeCaption');

  let currentPage = 1;
  let isLoading = false;
  let hasMore = true;
  let isMobile = window.matchMedia("(max-width: 768px)").matches;

  // Check authentication
  const token = localStorage.getItem('authToken');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // Handle window resize
  window.addEventListener('resize', () => {
    isMobile = window.matchMedia("(max-width: 768px)").matches;
  });

  // Load initial memes
  loadMemes();

  // Responsive infinite scroll
  window.addEventListener('scroll', () => {
    if (isLoading || !hasMore) return;
    
    const scrollThreshold = isMobile ? 300 : 500;
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - scrollThreshold) {
      loadMemes();
    }
  });

  // Upload modal controls
  uploadBtn.addEventListener('click', () => {
    uploadModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });

  function closeModalHandler() {
    uploadModal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }

  closeModal.addEventListener('click', closeModalHandler);
  uploadModal.addEventListener('click', (e) => e.target === uploadModal && closeModalHandler());

  // File preview with responsive sizing
  memeFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    filePreview.innerHTML = '';
    const previewElement = file.type.startsWith('image/') 
      ? document.createElement('img')
      : document.createElement('video');
    
    previewElement.src = URL.createObjectURL(file);
    previewElement.style.maxWidth = '100%';
    previewElement.style.maxHeight = isMobile ? '300px' : '400px';
    previewElement.style.objectFit = 'contain';
    if (previewElement.tagName === 'VIDEO') previewElement.controls = true;
    
    filePreview.appendChild(previewElement);
  });

memeUploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = memeFileInput.files[0];
  const caption = memeCaptionInput.value;
  
  if (!file) {
    showToast('Please select a file', 'error');
    return;
  }

  try {
    const submitBtn = memeUploadForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';

    const formData = new FormData();
    formData.append('memeFile', file);
    formData.append('caption', caption);

    const response = await fetch(`${API_BASE_URL}/api/memes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: formData
    });

    // First check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(text || 'Invalid server response');
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    closeModalHandler();
    memeFileInput.value = '';
    memeCaptionInput.value = '';
    filePreview.innerHTML = '';
    
    // Refresh the memes list
    currentPage = 1;
    hasMore = true;
    memeGrid.innerHTML = '';
    loadMemes();
    
    showToast('Meme uploaded successfully!', 'success');
  } catch (error) {
    console.error('Upload error:', error);
    // Handle HTML error responses
    if (error.message.startsWith('<!DOCTYPE') || error.message.startsWith('<html')) {
      showToast('Upload failed: Server error', 'error');
    } else {
      showToast(`Upload failed: ${error.message}`, 'error');
    }
  } finally {
    const submitBtn = memeUploadForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Upload Meme';
    }
  }
});
  // Load memes with responsive layout
  async function loadMemes() {
    if (isLoading || !hasMore) return;
    
    isLoading = true;
    loadingIndicator.style.display = 'block';

    try {
      const limit = isMobile ? 4 : 5;
      const response = await fetch(`${API_BASE_URL}/api/memes?page=${currentPage}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const { data: memes, pagination } = await response.json();
      
      if (!memes || memes.length === 0) {
        hasMore = false;
        if (currentPage === 1) showEmptyState();
        return;
      }

      renderMemes(memes.filter(meme => meme.filename && meme.type));
      currentPage++;
      hasMore = currentPage <= pagination.totalPages;
    } catch (error) {
      console.error('Error loading memes:', error);
      showError(error);
    } finally {
      isLoading = false;
      loadingIndicator.style.display = 'none';
    }
  }

  // Responsive meme rendering
  function renderMemes(memes) {
    const fragment = document.createDocumentFragment();
    
    memes.forEach(meme => {
      const memeItem = document.createElement('div');
      memeItem.className = 'meme-item';
      
      // Media container with responsive sizing
      const mediaContainer = document.createElement('div');
      mediaContainer.className = 'meme-media-container';
      
      const mediaElement = meme.type === 'image' 
        ? document.createElement('img')
        : document.createElement('video');
      
      mediaElement.src = `${API_BASE_URL}/uploads/${meme.filename}`;
      mediaElement.alt = meme.caption || 'Cricket meme';
      mediaElement.loading = 'lazy';
      mediaElement.className = 'meme-media';
      if (meme.type === 'video') mediaElement.controls = true;

      // Info section
      const infoDiv = document.createElement('div');
      infoDiv.className = 'meme-info';
      
      const captionDiv = document.createElement('div');
      captionDiv.className = 'meme-caption';
      captionDiv.textContent = meme.caption || '';
      
      const metaDiv = document.createElement('div');
      metaDiv.className = 'meme-meta';
      metaDiv.innerHTML = `
        <span class="meme-uploader">${meme.uploaderName || 'Anonymous'}</span>
        <button class="like-btn" data-id="${meme._id}">
          ❤️ ${meme.likes || 0}
        </button>
      `;

      // Like button with responsive sizing
      const likeBtn = metaDiv.querySelector('.like-btn');
      likeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        likeBtn.disabled = true;
        try {
          const response = await fetch(`${API_BASE_URL}/api/memes/${meme._id}/like`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const result = await response.json();
            likeBtn.innerHTML = `❤️ ${result.likes || meme.likes + 1}`;
          } else {
            throw new Error('Like failed');
          }
        } catch (error) {
          console.error('Like error:', error);
          showToast('Failed to like meme', 'error');
        } finally {
          likeBtn.disabled = false;
        }
      });

      mediaContainer.appendChild(mediaElement);
      infoDiv.appendChild(captionDiv);
      infoDiv.appendChild(metaDiv);
      memeItem.appendChild(mediaContainer);
      memeItem.appendChild(infoDiv);
      fragment.appendChild(memeItem);
    });

    memeGrid.appendChild(fragment);
  }

  // Responsive helper functions
  function showEmptyState() {
    memeGrid.innerHTML = `
      <div class="empty-state">
        <p>No memes found yet</p>
        <button id="uploadEmptyBtn">Upload First Meme</button>
      </div>
    `;
    document.getElementById('uploadEmptyBtn').addEventListener('click', () => {
      uploadModal.style.display = 'flex';
    });
  }

  function showError(error) {
    memeGrid.innerHTML = `
      <div class="error-message">
        <p>Failed to load memes</p>
        <p>${error.message}</p>
        <button onclick="window.location.reload()">Retry</button>
      </div>
    `;
  }

  function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }, 100);
  }
});