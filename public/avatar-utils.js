// Avatar Loading Utilities - Robust avatar loading with multiple fallbacks
// Ensures users never see "picture missing" errors

class AvatarUtils {
    constructor() {
        // Base64 encoded minimal avatar SVG as ultimate fallback
        this.base64FallbackAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTAwIiBjeT0iMTAwIiByPSIxMDAiIGZpbGw9IiNlMGUwZTAiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSI4MCIgcj0iNDAiIGZpbGw9IiM5ZTllOWUiLz48cGF0aCBkPSJNMTAwIDEzMCBDIDYwIDEzMCwgNDAgMTgwLCA0MCAyMDAgTCAxNjAgMjAwIEMgMTYwIDE4MCwgMTQwIDEzMCwgMTAwIDEzMCIgZmlsbD0iIzllOWU5ZSIvPjwvc3ZnPg==';
        
        // Default avatar path
        this.defaultAvatarPath = '/avatars/default-avatar.svg';
        
        // Cache for loaded avatars to prevent repeated failures
        this.avatarCache = new Map();
        this.failedUrls = new Set();
        
        // Retry configuration
        this.maxRetries = 2;
        this.retryDelay = 1000; // 1 second
    }
    
    // Test if a URL is accessible
    async testImageUrl(url) {
        return new Promise((resolve) => {
            const img = new Image();
            const timeout = setTimeout(() => {
                resolve(false);
            }, 5000); // 5 second timeout
            
            img.onload = () => {
                clearTimeout(timeout);
                resolve(true);
            };
            
            img.onerror = () => {
                clearTimeout(timeout);
                resolve(false);
            };
            
            img.src = url;
        });
    }
    
    // Get the best available avatar URL with fallbacks
    async getAvatarUrl(primaryUrl, lifrasID = null) {
        // If we have a cached result, use it
        const cacheKey = primaryUrl || `lifrasID_${lifrasID}`;
        if (this.avatarCache.has(cacheKey)) {
            return this.avatarCache.get(cacheKey);
        }
        
        let finalUrl = this.base64FallbackAvatar; // Ultimate fallback
        
        // Try primary URL first (if provided and not known to fail)
        if (primaryUrl && !this.failedUrls.has(primaryUrl)) {
            const primaryWorks = await this.testImageUrl(primaryUrl);
            if (primaryWorks) {
                finalUrl = primaryUrl;
                this.avatarCache.set(cacheKey, finalUrl);
                return finalUrl;
            } else {
                this.failedUrls.add(primaryUrl);
            }
        }
        
        // Try default avatar SVG
        if (!this.failedUrls.has(this.defaultAvatarPath)) {
            const defaultWorks = await this.testImageUrl(this.defaultAvatarPath);
            if (defaultWorks) {
                finalUrl = this.defaultAvatarPath;
            } else {
                this.failedUrls.add(this.defaultAvatarPath);
                console.warn('Default avatar SVG failed to load, using base64 fallback');
            }
        }
        
        // Cache and return result
        this.avatarCache.set(cacheKey, finalUrl);
        return finalUrl;
    }
    
    // Set up robust avatar loading for an img element
    setupRobustAvatar(imgElement, primaryUrl, lifrasID = null, options = {}) {
        const { 
            showLoading = true, 
            loadingClass = 'loading',
            onSuccess = null,
            onFallback = null,
            retries = this.maxRetries 
        } = options;
        
        // Set loading state
        if (showLoading && loadingClass) {
            imgElement.classList.add(loadingClass);
        }
        
        // Start with base64 fallback to ensure something shows immediately
        imgElement.src = this.base64FallbackAvatar;
        
        // Attempt to load better avatar asynchronously
        this.getAvatarUrl(primaryUrl, lifrasID).then(bestUrl => {
            imgElement.src = bestUrl;
            
            // Set up error handler for runtime failures
            imgElement.onerror = () => {
                console.warn('Avatar loading failed at runtime, using fallback');
                if (imgElement.src !== this.base64FallbackAvatar) {
                    imgElement.src = this.base64FallbackAvatar;
                    if (onFallback) onFallback();
                }
            };
            
            imgElement.onload = () => {
                if (showLoading && loadingClass) {
                    imgElement.classList.remove(loadingClass);
                }
                if (onSuccess) onSuccess(bestUrl);
            };
        }).catch(error => {
            console.error('Avatar loading error:', error);
            imgElement.src = this.base64FallbackAvatar;
            if (showLoading && loadingClass) {
                imgElement.classList.remove(loadingClass);
            }
            if (onFallback) onFallback();
        });
    }
    
    // Load avatar from Firebase Storage with CORS handling
    async loadFirebaseAvatar(lifrasID) {
        try {
            if (!window.db) {
                throw new Error('Firestore not initialized');
            }
            
            const avatarQuery = await window.db.collection('avatars')
                .where('lifrasID', '==', lifrasID)
                .limit(1)
                .get();
            
            if (!avatarQuery.empty) {
                const avatarData = avatarQuery.docs[0].data();
                if (avatarData.photoURL) {
                    // Test if the Firebase Storage URL is accessible
                    const urlWorks = await this.testImageUrl(avatarData.photoURL);
                    if (urlWorks) {
                        return avatarData.photoURL;
                    } else {
                        console.warn(`Firebase Storage avatar URL failed for lifrasID ${lifrasID} (likely CORS issue)`);
                    }
                }
            }
            
            // Fallback to default
            return await this.getAvatarUrl(null, lifrasID);
        } catch (error) {
            console.error('Firebase avatar loading error:', error);
            return await this.getAvatarUrl(null, lifrasID);
        }
    }
    
    // Create a new img element with robust avatar loading
    createAvatarImage(primaryUrl, lifrasID = null, options = {}) {
        const { 
            className = 'avatar-image',
            alt = 'Avatar',
            ...setupOptions 
        } = options;
        
        const img = document.createElement('img');
        img.className = className;
        img.alt = alt;
        
        this.setupRobustAvatar(img, primaryUrl, lifrasID, setupOptions);
        
        return img;
    }
    
    // Clear cache (useful for testing or after avatar updates)
    clearCache() {
        this.avatarCache.clear();
        this.failedUrls.clear();
    }
    
    // Retry a failed URL (useful when network conditions improve)
    retryFailedUrl(url) {
        this.failedUrls.delete(url);
        this.avatarCache.delete(url);
    }
}

// Create global instance
window.AvatarUtils = new AvatarUtils();

// Legacy compatibility functions
window.setupRobustAvatar = (img, primaryUrl, lifrasID, options) => 
    window.AvatarUtils.setupRobustAvatar(img, primaryUrl, lifrasID, options);

window.loadFirebaseAvatar = (lifrasID) => 
    window.AvatarUtils.loadFirebaseAvatar(lifrasID);

window.createAvatarImage = (primaryUrl, lifrasID, options) => 
    window.AvatarUtils.createAvatarImage(primaryUrl, lifrasID, options);

console.log('✅ Avatar utilities loaded with robust error handling');