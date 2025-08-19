// Mobile Camera Integration for CalyClub
// Provides camera capture, QR code scanning, and image processing for mobile devices

class MobileCamera {
    constructor() {
        this.isInitialized = false;
        this.stream = null;
        this.video = null;
        this.canvas = null;
        this.context = null;
        this.isCapturing = false;
        this.facingMode = 'user'; // 'user' for front camera, 'environment' for back camera
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        // Check if we're on a mobile device and camera is supported
        if (this.isMobileDevice() && this.isCameraSupported()) {
            this.createCameraInterface();
        }
        
        this.isInitialized = true;
    }

    // Detect mobile device
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    // Check camera support
    isCameraSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    // Create camera interface
    createCameraInterface() {
        const cameraModal = document.createElement('div');
        cameraModal.id = 'mobile-camera-modal';
        cameraModal.innerHTML = `
            ${this.createCameraStyles()}
            <div class="camera-overlay">
                <div class="camera-container">
                    <div class="camera-header">
                        <button class="camera-btn camera-close" onclick="window.mobileCamera.closeCamera()">
                            ✕
                        </button>
                        <h3 class="camera-title">Appareil Photo</h3>
                        <button class="camera-btn camera-switch" onclick="window.mobileCamera.switchCamera()">
                            🔄
                        </button>
                    </div>
                    
                    <div class="camera-viewport">
                        <video id="mobile-camera-video" autoplay playsinline muted></video>
                        <canvas id="mobile-camera-canvas" style="display: none;"></canvas>
                        
                        <!-- Camera guides -->
                        <div class="camera-guides">
                            <div class="guide-frame"></div>
                            <div class="guide-text">Centrez le sujet dans le cadre</div>
                        </div>
                        
                        <!-- QR Scanner overlay -->
                        <div class="qr-scanner-overlay" style="display: none;">
                            <div class="qr-scanner-frame">
                                <div class="qr-corner qr-corner-tl"></div>
                                <div class="qr-corner qr-corner-tr"></div>
                                <div class="qr-corner qr-corner-bl"></div>
                                <div class="qr-corner qr-corner-br"></div>
                            </div>
                            <div class="qr-scanner-text">Placez le QR code dans le cadre</div>
                        </div>
                    </div>
                    
                    <div class="camera-controls">
                        <button class="camera-btn camera-gallery" onclick="window.mobileCamera.openGallery()">
                            🖼️
                        </button>
                        <button class="camera-btn camera-capture" onclick="window.mobileCamera.capturePhoto()">
                            <div class="capture-button">
                                <div class="capture-inner"></div>
                            </div>
                        </button>
                        <button class="camera-btn camera-flash" onclick="window.mobileCamera.toggleFlash()">
                            💡
                        </button>
                    </div>
                    
                    <div class="camera-modes">
                        <button class="mode-btn active" data-mode="photo" onclick="window.mobileCamera.setMode('photo')">
                            Photo
                        </button>
                        <button class="mode-btn" data-mode="qr" onclick="window.mobileCamera.setMode('qr')">
                            QR Code
                        </button>
                        <button class="mode-btn" data-mode="document" onclick="window.mobileCamera.setMode('document')">
                            Document
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(cameraModal);
        
        // Get video and canvas elements
        this.video = document.getElementById('mobile-camera-video');
        this.canvas = document.getElementById('mobile-camera-canvas');
        this.context = this.canvas.getContext('2d');
        
        // Set initial mode
        this.currentMode = 'photo';
    }

    // Create camera styles
    createCameraStyles() {
        return `
            <style>
                #mobile-camera-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.9);
                    z-index: 10000;
                    display: none;
                    align-items: center;
                    justify-content: center;
                }

                #mobile-camera-modal.active {
                    display: flex;
                    animation: cameraFadeIn 0.3s ease;
                }

                .camera-overlay {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }

                .camera-container {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    background: #000;
                    position: relative;
                }

                .camera-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 15px 20px;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    position: relative;
                    z-index: 2;
                }

                .camera-title {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                }

                .camera-btn {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    padding: 8px;
                    border-radius: 50%;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .camera-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                }

                .camera-btn:active {
                    transform: scale(0.9);
                }

                .camera-viewport {
                    flex: 1;
                    position: relative;
                    background: #000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                }

                #mobile-camera-video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transform: scaleX(-1); /* Mirror for selfie */
                }

                #mobile-camera-video.environment {
                    transform: none; /* Don't mirror back camera */
                }

                .camera-guides {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    pointer-events: none;
                    z-index: 1;
                }

                .guide-frame {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 200px;
                    height: 200px;
                    transform: translate(-50%, -50%);
                    border: 2px solid rgba(255, 255, 255, 0.5);
                    border-radius: 12px;
                }

                .guide-text {
                    position: absolute;
                    bottom: 100px;
                    left: 50%;
                    transform: translateX(-50%);
                    color: white;
                    font-size: 14px;
                    text-align: center;
                    background: rgba(0, 0, 0, 0.6);
                    padding: 8px 16px;
                    border-radius: 20px;
                }

                /* QR Scanner overlay */
                .qr-scanner-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    pointer-events: none;
                    z-index: 2;
                }

                .qr-scanner-frame {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 250px;
                    height: 250px;
                    transform: translate(-50%, -50%);
                    border: 2px solid #0066cc;
                    border-radius: 8px;
                }

                .qr-corner {
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    border: 3px solid #0066cc;
                }

                .qr-corner-tl { top: -3px; left: -3px; border-right: none; border-bottom: none; }
                .qr-corner-tr { top: -3px; right: -3px; border-left: none; border-bottom: none; }
                .qr-corner-bl { bottom: -3px; left: -3px; border-right: none; border-top: none; }
                .qr-corner-br { bottom: -3px; right: -3px; border-left: none; border-top: none; }

                .qr-scanner-text {
                    position: absolute;
                    bottom: 80px;
                    left: 50%;
                    transform: translateX(-50%);
                    color: #0066cc;
                    font-size: 16px;
                    font-weight: 600;
                    text-align: center;
                    background: rgba(255, 255, 255, 0.9);
                    padding: 12px 20px;
                    border-radius: 25px;
                }

                .camera-controls {
                    display: flex;
                    align-items: center;
                    justify-content: space-around;
                    padding: 20px;
                    background: rgba(0, 0, 0, 0.8);
                    position: relative;
                    z-index: 2;
                }

                .camera-capture {
                    width: 70px !important;
                    height: 70px !important;
                    background: none !important;
                    padding: 0 !important;
                }

                .capture-button {
                    width: 70px;
                    height: 70px;
                    border: 4px solid white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                }

                .capture-inner {
                    width: 50px;
                    height: 50px;
                    background: white;
                    border-radius: 50%;
                    transition: all 0.2s ease;
                }

                .camera-capture:active .capture-button {
                    transform: scale(0.9);
                }

                .camera-capture:active .capture-inner {
                    transform: scale(0.8);
                }

                .camera-modes {
                    display: flex;
                    justify-content: center;
                    gap: 10px;
                    padding: 15px;
                    background: rgba(0, 0, 0, 0.9);
                }

                .mode-btn {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .mode-btn.active {
                    background: #0066cc;
                    color: white;
                }

                .mode-btn:hover {
                    background: rgba(255, 255, 255, 0.3);
                }

                .mode-btn.active:hover {
                    background: #0052a3;
                }

                /* Animations */
                @keyframes cameraFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes captureFlash {
                    0% { background: transparent; }
                    50% { background: rgba(255, 255, 255, 0.8); }
                    100% { background: transparent; }
                }

                .capture-flash {
                    animation: captureFlash 0.3s ease;
                }

                /* Safe area support for newer devices */
                .camera-header {
                    padding-top: max(15px, env(safe-area-inset-top));
                }

                .camera-controls {
                    padding-bottom: max(20px, env(safe-area-inset-bottom));
                }

                /* Landscape orientation adjustments */
                @media (orientation: landscape) and (max-height: 500px) {
                    .camera-header {
                        padding: 10px 20px;
                    }
                    
                    .camera-controls {
                        padding: 15px;
                    }
                    
                    .camera-modes {
                        padding: 10px;
                    }
                    
                    .guide-text,
                    .qr-scanner-text {
                        bottom: 50px;
                        font-size: 12px;
                        padding: 6px 12px;
                    }
                }
            </style>
        `;
    }

    // Open camera with specific mode
    async openCamera(mode = 'photo', callback = null) {
        this.currentMode = mode;
        this.captureCallback = callback;

        try {
            // Request camera permission
            const constraints = {
                video: {
                    facingMode: this.facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;

            // Show camera modal
            const modal = document.getElementById('mobile-camera-modal');
            modal.classList.add('active');

            // Set mode
            this.setMode(mode);

            // Update video mirror based on camera
            if (this.facingMode === 'environment') {
                this.video.classList.add('environment');
            } else {
                this.video.classList.remove('environment');
            }

            // If QR mode, start scanning
            if (mode === 'qr') {
                this.startQRScanning();
            }

        } catch (error) {
            console.error('Camera access error:', error);
            this.showError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
        }
    }

    // Close camera
    closeCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.qrScanInterval) {
            clearInterval(this.qrScanInterval);
            this.qrScanInterval = null;
        }

        const modal = document.getElementById('mobile-camera-modal');
        modal.classList.remove('active');

        this.isCapturing = false;
    }

    // Switch between front and back camera
    async switchCamera() {
        this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
        
        // Stop current stream
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }

        // Restart with new camera
        try {
            const constraints = {
                video: {
                    facingMode: this.facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;

            // Update video mirror
            if (this.facingMode === 'environment') {
                this.video.classList.add('environment');
            } else {
                this.video.classList.remove('environment');
            }

        } catch (error) {
            console.error('Camera switch error:', error);
            this.showError('Impossible de changer de caméra');
        }
    }

    // Set camera mode
    setMode(mode) {
        this.currentMode = mode;

        // Update mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');

        // Show/hide overlays
        const qrOverlay = document.querySelector('.qr-scanner-overlay');
        const guides = document.querySelector('.camera-guides');

        if (mode === 'qr') {
            qrOverlay.style.display = 'block';
            guides.style.display = 'none';
            this.startQRScanning();
        } else {
            qrOverlay.style.display = 'none';
            guides.style.display = 'block';
            if (this.qrScanInterval) {
                clearInterval(this.qrScanInterval);
                this.qrScanInterval = null;
            }
        }

        // Update guide text based on mode
        const guideText = document.querySelector('.guide-text');
        const modeTexts = {
            photo: 'Centrez le sujet dans le cadre',
            document: 'Alignez le document dans le cadre',
            qr: 'Placez le QR code dans le cadre'
        };
        guideText.textContent = modeTexts[mode];
    }

    // Capture photo
    async capturePhoto() {
        if (this.isCapturing) return;
        
        this.isCapturing = true;

        try {
            // Show capture flash effect
            const viewport = document.querySelector('.camera-viewport');
            viewport.classList.add('capture-flash');

            // Add haptic feedback
            if ('vibrate' in navigator) {
                navigator.vibrate(50);
            }

            // Set canvas size to match video
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;

            // Draw video frame to canvas
            if (this.facingMode === 'user') {
                // Mirror front camera
                this.context.save();
                this.context.scale(-1, 1);
                this.context.drawImage(this.video, -this.canvas.width, 0, this.canvas.width, this.canvas.height);
                this.context.restore();
            } else {
                this.context.drawImage(this.video, 0, 0);
            }

            // Convert to blob
            const blob = await new Promise(resolve => {
                this.canvas.toBlob(resolve, 'image/jpeg', 0.9);
            });

            // Create file object
            const file = new File([blob], `photo_${Date.now()}.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now()
            });

            // Process based on mode
            if (this.currentMode === 'document') {
                await this.processDocument(blob);
            } else {
                await this.processPhoto(blob, file);
            }

            // Call callback if provided
            if (this.captureCallback) {
                this.captureCallback(blob, file);
            }

            setTimeout(() => {
                viewport.classList.remove('capture-flash');
                this.isCapturing = false;
            }, 300);

        } catch (error) {
            console.error('Capture error:', error);
            this.showError('Erreur lors de la capture');
            this.isCapturing = false;
        }
    }

    // Process captured photo
    async processPhoto(blob, file) {
        // Show preview or save options
        this.showCapturePreview(blob, file);
    }

    // Process document capture
    async processDocument(blob) {
        // Could add document enhancement here (contrast, perspective correction)
        this.showCapturePreview(blob);
    }

    // Start QR code scanning
    startQRScanning() {
        if (this.qrScanInterval) {
            clearInterval(this.qrScanInterval);
        }

        this.qrScanInterval = setInterval(() => {
            if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
                this.scanQRCode();
            }
        }, 500);
    }

    // Scan QR code from video feed
    scanQRCode() {
        try {
            // Set canvas size
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;

            // Draw current video frame
            this.context.drawImage(this.video, 0, 0);

            // Get image data for QR scanning
            const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);

            // Here you would use a QR code library like jsQR
            // For now, we'll simulate QR detection
            this.simulateQRDetection(imageData);

        } catch (error) {
            console.error('QR scan error:', error);
        }
    }

    // Simulate QR code detection (replace with actual QR library)
    simulateQRDetection(imageData) {
        // This is a placeholder - in a real implementation, you'd use jsQR or similar
        // const code = jsQR(imageData.data, imageData.width, imageData.height);
        // if (code) {
        //     this.handleQRCodeDetected(code.data);
        // }
    }

    // Handle detected QR code
    handleQRCodeDetected(qrData) {
        // Add haptic feedback
        if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100]);
        }

        // Show QR result
        this.showQRResult(qrData);
    }

    // Show QR scanning result
    showQRResult(qrData) {
        const resultDiv = document.createElement('div');
        resultDiv.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); 
                        z-index: 10001; max-width: 300px;">
                <h3 style="margin: 0 0 15px 0; color: #0066cc;">QR Code Détecté</h3>
                <p style="margin: 0 0 20px 0; word-break: break-all; font-size: 14px;">${qrData}</p>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            style="padding: 8px 16px; background: #f0f0f0; border: none; border-radius: 6px;">
                        Fermer
                    </button>
                    <button onclick="window.mobileCamera.handleQRAction('${qrData}'); this.parentElement.parentElement.parentElement.remove();" 
                            style="padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 6px;">
                        Utiliser
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(resultDiv);

        // Stop scanning temporarily
        if (this.qrScanInterval) {
            clearInterval(this.qrScanInterval);
            this.qrScanInterval = null;
        }
    }

    // Handle QR code actions
    handleQRAction(qrData) {
        // Close camera
        this.closeCamera();

        // Process QR data based on content
        if (qrData.startsWith('http')) {
            // URL - ask user if they want to open it
            if (confirm('Ouvrir ce lien ?\n' + qrData)) {
                window.open(qrData, '_blank');
            }
        } else if (this.captureCallback) {
            // Pass to callback
            this.captureCallback(qrData);
        } else {
            // Show in toast
            this.showToast('QR Code: ' + qrData, 'success');
        }
    }

    // Show capture preview
    showCapturePreview(blob, file) {
        const url = URL.createObjectURL(blob);
        
        const previewDiv = document.createElement('div');
        previewDiv.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); 
                        z-index: 10001; display: flex; flex-direction: column;">
                <div style="padding: 15px; display: flex; justify-content: space-between; align-items: center; color: white;">
                    <button onclick="this.parentElement.parentElement.parentElement.remove(); window.mobileCamera.closeCamera();" 
                            style="background: none; border: none; color: white; font-size: 20px; padding: 8px;">✕</button>
                    <h3 style="margin: 0;">Photo Capturée</h3>
                    <div></div>
                </div>
                <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 20px;">
                    <img src="${url}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px;">
                </div>
                <div style="padding: 20px; display: flex; gap: 15px; justify-content: center;">
                    <button onclick="this.parentElement.parentElement.parentElement.remove(); window.mobileCamera.openCamera('${this.currentMode}');" 
                            style="padding: 12px 24px; background: #666; color: white; border: none; border-radius: 8px; font-size: 16px;">
                        Reprendre
                    </button>
                    <button onclick="window.mobileCamera.savePhoto('${url}'); this.parentElement.parentElement.parentElement.remove(); window.mobileCamera.closeCamera();" 
                            style="padding: 12px 24px; background: #0066cc; color: white; border: none; border-radius: 8px; font-size: 16px;">
                        Enregistrer
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(previewDiv);
    }

    // Save photo
    savePhoto(url) {
        // Download the image
        const link = document.createElement('a');
        link.href = url;
        link.download = `calyclub_photo_${Date.now()}.jpg`;
        link.click();
        
        this.showToast('Photo enregistrée', 'success');
    }

    // Open device gallery
    openGallery() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const url = URL.createObjectURL(file);
                this.showCapturePreview(file, file);
            }
        };
        input.click();
    }

    // Toggle flash (if supported)
    toggleFlash() {
        // Flash control is limited in web browsers
        // This would require getUserMedia with torch constraint (Android Chrome only)
        this.showToast('Flash non disponible via le navigateur', 'info');
    }

    // Show error message
    showError(message) {
        this.showToast(message, 'error');
    }

    // Show toast notification
    showToast(message, type = 'info') {
        if (window.mobileNav && window.mobileNav.showToast) {
            window.mobileNav.showToast(message, type);
        } else {
            alert(message);
        }
    }

    // Public methods for external use
    
    // Take photo for avatar
    captureAvatar(callback) {
        this.openCamera('photo', callback);
    }

    // Scan QR code for payments
    scanQRForPayment(callback) {
        this.openCamera('qr', callback);
    }

    // Capture document
    captureDocument(callback) {
        this.openCamera('document', callback);
    }

    // Check if camera is available
    isAvailable() {
        return this.isMobileDevice() && this.isCameraSupported();
    }
}

// Initialize mobile camera when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mobileCamera = new MobileCamera();
    });
} else {
    window.mobileCamera = new MobileCamera();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileCamera;
}