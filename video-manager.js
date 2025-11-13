/**
 * Video Manager Module
 * Handles video and thumbnail upload, replacement, and management
 */

class VideoManager {
    constructor() {
        this.currentConfig = null;
        this.uploadingVideo = false;
        this.uploadingThumbnail = false;
        this.uploadThingAppId = '9v6fd3xlqu';
        this.uploadThingToken = null;
        
        this.init();
    }

    async init() {
        console.log('🎬 Video Manager initializing...');
        
        // Get UploadThing token from environment
        this.uploadThingToken = window.ENV?.VITE_UPLOADTHING_TOKEN || 
            'eyJhcGlLZXkiOiJza19saXZlX2Q4MzYxM2Y5NGM5YzViM2YxZWMwYjY5N2IzM2VlZjMzOWRkMzVlNWQwMzgwNTkxYjdlMTUzOGE0NzA4OWIyZjEiLCJhcHBJZCI6Ijl2NmZkM3hscXUiLCJyZWdpb25zIjpbInNlYTEiXX0=';
        
        this.bindEvents();
        await this.loadCurrentVideo();
    }

    bindEvents() {
        // Video file input
        const videoInput = document.getElementById('new-video-upload');
        if (videoInput) {
            videoInput.addEventListener('change', (e) => this.handleVideoFileSelect(e));
        }

        // Thumbnail file input
        const thumbnailInput = document.getElementById('new-thumbnail-upload');
        if (thumbnailInput) {
            thumbnailInput.addEventListener('change', (e) => this.handleThumbnailFileSelect(e));
        }

        // Form submission
        const form = document.getElementById('video-upload-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Drag and drop for video
        const videoDropZone = document.querySelector('#video-upload-placeholder')?.parentElement;
        if (videoDropZone) {
            videoDropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                videoDropZone.classList.add('border-slate-500', 'bg-slate-50');
            });

            videoDropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                videoDropZone.classList.remove('border-slate-500', 'bg-slate-50');
            });

            videoDropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                videoDropZone.classList.remove('border-slate-500', 'bg-slate-50');
                
                const files = e.dataTransfer.files;
                if (files.length > 0 && files[0].type.startsWith('video/')) {
                    document.getElementById('new-video-upload').files = files;
                    this.handleVideoFileSelect({ target: { files } });
                }
            });
        }
    }

    async loadCurrentVideo() {
        try {
            console.log('📹 Loading current video configuration...');
            
            // Show loading state
            this.showElement('video-loading-preview');
            this.showElement('thumbnail-loading-preview');

            // Use default config (API will be available after Vercel deployment)
            const config = {
                videoUrl: 'https://9v6fd3xlqu.ufs.sh/f/1rEveYHUVj03jFCh0C995pnTJ3AOCxrqDRdPvIKeGwNhS6c0',
                thumbnailUrl: 'https://9v6fd3xlqu.ufs.sh/f/1rEveYHUVj03R431BcSBJN3sMh2mZC8waHSkeVQ4qnIU0c6o',
                videoFileKey: '1rEveYHUVj03jFCh0C995pnTJ3AOCxrqDRdPvIKeGwNhS6c0',
                thumbnailFileKey: '1rEveYHUVj03R431BcSBJN3sMh2mZC8waHSkeVQ4qnIU0c6o',
                uploadedAt: new Date().toISOString(),
                uploadedBy: 'system'
            };
            
            this.currentConfig = config;

            // Update UI with current video
            const videoElement = document.getElementById('current-video-preview');
            const thumbnailElement = document.getElementById('current-thumbnail-preview');
            const videoLink = document.getElementById('current-video-link');
            const thumbnailLink = document.getElementById('current-thumbnail-link');
            const lastUpdated = document.getElementById('video-last-updated');

            if (videoElement) {
                videoElement.src = config.videoUrl;
                videoElement.poster = config.thumbnailUrl;
            }

            if (thumbnailElement) {
                thumbnailElement.src = config.thumbnailUrl;
                thumbnailElement.onload = () => this.hideElement('thumbnail-loading-preview');
            }

            if (videoLink) {
                videoLink.href = config.videoUrl;
                videoLink.textContent = this.truncateUrl(config.videoUrl);
            }

            if (thumbnailLink) {
                thumbnailLink.href = config.thumbnailUrl;
                thumbnailLink.textContent = this.truncateUrl(config.thumbnailUrl);
            }

            if (lastUpdated && config.uploadedAt) {
                lastUpdated.textContent = `Updated ${this.formatDate(config.uploadedAt)}`;
            }

            // Hide loading state when video can play
            videoElement.addEventListener('loadeddata', () => {
                this.hideElement('video-loading-preview');
            });

            console.log('✅ Current video loaded successfully');
        } catch (error) {
            console.error('❌ Error loading current video:', error);
            
            // Hide loading states
            this.hideElement('video-loading-preview');
            this.hideElement('thumbnail-loading-preview');
        }
    }

    handleVideoFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log('📹 Video file selected:', file.name, file.size);

        // Validate file type
        if (!file.type.startsWith('video/')) {
            this.showNotification('Please select a valid video file', 'error');
            return;
        }

        // Validate file size (200 MB = 200 * 1024 * 1024 bytes)
        const maxSize = 200 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showNotification('Video file is too large. Maximum size is 200 MB', 'error');
            return;
        }

        // Update UI
        const fileName = document.getElementById('video-file-name');
        const fileSize = document.getElementById('video-file-size');
        
        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = this.formatFileSize(file.size);

        this.hideElement('video-upload-placeholder');
        this.showElement('video-upload-preview');

        this.showNotification(`Video selected: ${file.name}`, 'success');
    }

    handleThumbnailFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log('🖼️ Thumbnail file selected:', file.name, file.size);

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select a valid image file', 'error');
            return;
        }

        // Validate file size (10 MB max for thumbnail)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showNotification('Thumbnail file is too large. Maximum size is 10 MB', 'error');
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewImg = document.getElementById('thumbnail-preview-img');
            if (previewImg) {
                previewImg.src = e.target.result;
            }
        };
        reader.readAsDataURL(file);

        this.hideElement('thumbnail-upload-placeholder');
        this.showElement('thumbnail-upload-preview');

        this.showNotification(`Thumbnail selected: ${file.name}`, 'success');
    }

    async handleFormSubmit(event) {
        event.preventDefault();

        const videoFile = document.getElementById('new-video-upload').files[0];
        const thumbnailFile = document.getElementById('new-thumbnail-upload').files[0];

        if (!videoFile || !thumbnailFile) {
            this.showNotification('Please select both video and thumbnail files', 'error');
            return;
        }

        // Confirm with user
        const confirmed = confirm(
            'Are you sure you want to replace the current video and thumbnail?\n\n' +
            `Video: ${videoFile.name} (${this.formatFileSize(videoFile.size)})\n` +
            `Thumbnail: ${thumbnailFile.name} (${this.formatFileSize(thumbnailFile.size)})\n\n` +
            'The website will be updated immediately.'
        );

        if (!confirmed) return;

        try {
            // Disable form
            this.setFormEnabled(false);
            this.showElement('submit-video-loading');
            this.hideElement('submit-video-text');

            console.log('🚀 Starting video replacement process...');

            // Step 1: Upload video to UploadThing
            const videoUrl = await this.uploadToUploadThing(videoFile, 'video');

            // Step 2: Upload thumbnail to UploadThing
            const thumbnailUrl = await this.uploadToUploadThing(thumbnailFile, 'thumbnail');

            // Step 3: Update configuration via API
            await this.updateVideoConfiguration(videoUrl, thumbnailUrl);

            // Step 4: Reload current video
            await this.loadCurrentVideo();

            // Step 5: Reset form
            this.resetForm();

            this.showNotification('✅ Video and thumbnail replaced successfully!', 'success');
            console.log('✅ Video replacement completed successfully');

        } catch (error) {
            console.error('❌ Error replacing video:', error);
            this.showNotification(`Failed to replace video: ${error.message}`, 'error');
        } finally {
            this.setFormEnabled(true);
            this.hideElement('submit-video-loading');
            this.showElement('submit-video-text');
        }
    }

    async uploadToUploadThing(file, type) {
        return new Promise(async (resolve, reject) => {
            try {
                console.log(`📤 Uploading ${type} to UploadThing...`);

                // Show progress bar
                const progressContainer = document.getElementById(`${type}-upload-progress`);
                const progressBar = document.getElementById(`${type}-progress-bar`);
                const progressPercent = document.getElementById(`${type}-upload-percent`);
                
                this.showElement(progressContainer);

                // Get authentication token
                const jwt = await this.getAuthToken();

                // Create FormData
                const formData = new FormData();
                formData.append('file', file);
                formData.append('type', type);

                // Upload via backend API
                const xhr = new XMLHttpRequest();

                // Progress tracking
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        if (progressBar) progressBar.style.width = `${percent}%`;
                        if (progressPercent) progressPercent.textContent = `${percent}%`;
                    }
                });

                // Success
                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            
                            if (!response.success || !response.url) {
                                reject(new Error(response.error || 'Upload failed'));
                                return;
                            }

                            console.log(`✅ ${type} uploaded:`, response.url);
                            this.hideElement(progressContainer);
                            resolve(response.url);
                        } catch (parseError) {
                            reject(new Error('Invalid response from server'));
                        }
                    } else {
                        try {
                            const error = JSON.parse(xhr.responseText);
                            reject(new Error(error.error || `Upload failed with status ${xhr.status}`));
                        } catch (e) {
                            reject(new Error(`Upload failed with status ${xhr.status}`));
                        }
                    }
                });

                // Error
                xhr.addEventListener('error', () => {
                    this.hideElement(progressContainer);
                    reject(new Error(
                        'Upload failed - network error.\n\n' +
                        'This feature requires deployment to Vercel.\n' +
                        'Please deploy the site first (git push origin main).'
                    ));
                });

                // Send request to backend API
                xhr.open('POST', '/api/upload-file');
                xhr.setRequestHeader('Authorization', `Bearer ${jwt}`);
                xhr.send(formData);

            } catch (error) {
                const progressContainer = document.getElementById(`${type}-upload-progress`);
                this.hideElement(progressContainer);
                reject(error);
            }
        });
    }

    async updateVideoConfiguration(videoUrl, thumbnailUrl) {
        try {
            console.log('💾 Updating video configuration...');

            // Get authentication token
            const jwt = await this.getAuthToken();

            const response = await fetch('/api/replace-video', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwt}`
                },
                body: JSON.stringify({
                    videoUrl,
                    thumbnailUrl
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update configuration');
            }

            const result = await response.json();
            console.log('✅ Configuration updated:', result);

            return result;
        } catch (error) {
            console.error('❌ Error updating configuration:', error);
            throw error;
        }
    }

    async getAuthToken() {
        // Get JWT from Appwrite session
        if (window.appwriteAuth && window.appwriteAuth.account) {
            try {
                const jwt = await window.appwriteAuth.account.createJWT();
                return jwt.jwt;
            } catch (error) {
                console.error('Failed to create JWT:', error);
                throw new Error('Authentication required');
            }
        }
        throw new Error('Not authenticated');
    }

    resetForm() {
        const form = document.getElementById('video-upload-form');
        if (form) form.reset();

        this.showElement('video-upload-placeholder');
        this.hideElement('video-upload-preview');
        this.showElement('thumbnail-upload-placeholder');
        this.hideElement('thumbnail-upload-preview');
        this.hideElement('video-upload-progress');
        this.hideElement('thumbnail-upload-progress');
    }

    setFormEnabled(enabled) {
        const submitBtn = document.getElementById('submit-video-upload');
        const cancelBtn = document.getElementById('cancel-video-upload');
        const videoInput = document.getElementById('new-video-upload');
        const thumbnailInput = document.getElementById('new-thumbnail-upload');

        if (submitBtn) submitBtn.disabled = !enabled;
        if (cancelBtn) cancelBtn.disabled = !enabled;
        if (videoInput) videoInput.disabled = !enabled;
        if (thumbnailInput) thumbnailInput.disabled = !enabled;
    }

    // Utility functions
    showElement(elementOrId) {
        const element = typeof elementOrId === 'string' 
            ? document.getElementById(elementOrId) 
            : elementOrId;
        if (element) element.classList.remove('hidden');
    }

    hideElement(elementOrId) {
        const element = typeof elementOrId === 'string' 
            ? document.getElementById(elementOrId) 
            : elementOrId;
        if (element) element.classList.add('hidden');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        return date.toLocaleDateString();
    }

    truncateUrl(url) {
        if (!url) return '';
        const parts = url.split('/');
        return '...' + parts[parts.length - 1].substring(0, 20);
    }

    showNotification(message, type = 'info') {
        // Use existing admin notification system
        if (window.adminPanel && window.adminPanel.showNotification) {
            window.adminPanel.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}]`, message);
            alert(message);
        }
    }
}

// Global functions for onclick handlers
window.clearVideoUpload = function() {
    const videoInput = document.getElementById('new-video-upload');
    if (videoInput) videoInput.value = '';
    
    const placeholder = document.getElementById('video-upload-placeholder');
    const preview = document.getElementById('video-upload-preview');
    
    if (placeholder) placeholder.classList.remove('hidden');
    if (preview) preview.classList.add('hidden');
};

window.clearThumbnailUpload = function() {
    const thumbnailInput = document.getElementById('new-thumbnail-upload');
    if (thumbnailInput) thumbnailInput.value = '';
    
    const placeholder = document.getElementById('thumbnail-upload-placeholder');
    const preview = document.getElementById('thumbnail-upload-preview');
    
    if (placeholder) placeholder.classList.remove('hidden');
    if (preview) preview.classList.add('hidden');
};

window.resetVideoForm = function() {
    if (window.videoManager) {
        window.videoManager.resetForm();
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.videoManager = new VideoManager();
    });
} else {
    window.videoManager = new VideoManager();
}
