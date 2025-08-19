// iPad Enhancement Utilities for CalyBase
// Touch-specific features and optimizations for iPad Safari

(function() {
    'use strict';

    // iPad detection and capabilities
    const iPadDetection = {
        isIPad: /iPad/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
        
        isLandscape: () => window.orientation === 90 || window.orientation === -90,
        
        isPortrait: () => window.orientation === 0 || window.orientation === 180,
        
        screenSize: {
            get width() { return window.screen.width; },
            get height() { return window.screen.height; },
            get availWidth() { return window.screen.availWidth; },
            get availHeight() { return window.screen.availHeight; }
        }
    };

    // Virtual keyboard handling
    const VirtualKeyboard = {
        isVisible: false,
        originalViewportHeight: window.innerHeight,
        
        init() {
            this.originalViewportHeight = window.innerHeight;
            this.setupListeners();
        },
        
        setupListeners() {
            // Detect virtual keyboard on resize
            window.addEventListener('resize', () => {
                const currentHeight = window.innerHeight;
                const heightDifference = this.originalViewportHeight - currentHeight;
                
                if (heightDifference > 150) { // Keyboard likely visible
                    this.onKeyboardShow(heightDifference);
                } else {
                    this.onKeyboardHide();
                }
            });
            
            // Focus events
            document.addEventListener('focusin', (e) => {
                if (this.isFormInput(e.target)) {
                    this.handleInputFocus(e.target);
                }
            });
            
            document.addEventListener('focusout', (e) => {
                if (this.isFormInput(e.target)) {
                    this.handleInputBlur(e.target);
                }
            });
        },
        
        isFormInput(element) {
            const inputTypes = ['input', 'textarea', 'select'];
            return inputTypes.includes(element.tagName.toLowerCase());
        },
        
        handleInputFocus(input) {
            // Prevent viewport jumping by scrolling input into view
            setTimeout(() => {
                input.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center',
                    inline: 'nearest'
                });
            }, 300);
        },
        
        handleInputBlur() {
            // Reset any adjustments made during input focus
            setTimeout(() => {
                window.scrollTo(0, 0);
            }, 100);
        },
        
        onKeyboardShow(heightDifference) {
            this.isVisible = true;
            document.body.classList.add('keyboard-visible');
            DebugLogger.log('🔤 Virtual keyboard shown, height diff:', heightDifference);
        },
        
        onKeyboardHide() {
            this.isVisible = false;
            document.body.classList.remove('keyboard-visible');
            DebugLogger.log('🔤 Virtual keyboard hidden');
        }
    };

    // Touch gesture enhancements
    const TouchGestures = {
        swipeThreshold: 50,
        swipeTimeout: 500,
        
        init() {
            this.setupSwipeGestures();
            this.setupTouchFeedback();
        },
        
        setupSwipeGestures() {
            let startX, startY, startTime;
            
            document.addEventListener('touchstart', (e) => {
                const touch = e.touches[0];
                startX = touch.clientX;
                startY = touch.clientY;
                startTime = Date.now();
            }, { passive: true });
            
            document.addEventListener('touchend', (e) => {
                if (!startX || !startY) return;
                
                const touch = e.changedTouches[0];
                const endX = touch.clientX;
                const endY = touch.clientY;
                const endTime = Date.now();
                
                const deltaX = endX - startX;
                const deltaY = endY - startY;
                const deltaTime = endTime - startTime;
                
                if (deltaTime > this.swipeTimeout) return;
                
                if (Math.abs(deltaX) > this.swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY)) {
                    if (deltaX > 0) {
                        this.onSwipeRight(e);
                    } else {
                        this.onSwipeLeft(e);
                    }
                }
                
                // Reset
                startX = null;
                startY = null;
            }, { passive: true });
        },
        
        setupTouchFeedback() {
            // Add touch feedback to interactive elements
            const interactiveElements = 'button, .btn-base, a, .clickable, .action-button';
            
            document.addEventListener('touchstart', (e) => {
                if (e.target.matches(interactiveElements)) {
                    e.target.classList.add('touch-active');
                }
            }, { passive: true });
            
            document.addEventListener('touchend', (e) => {
                if (e.target.matches(interactiveElements)) {
                    setTimeout(() => {
                        e.target.classList.remove('touch-active');
                    }, 150);
                }
            }, { passive: true });
        },
        
        onSwipeRight(e) {
            // Could be used for navigation - back gesture
            DebugLogger.log('👆 Swipe right detected');
            this.dispatchSwipeEvent('swiperight', e);
        },
        
        onSwipeLeft(e) {
            // Could be used for navigation - forward gesture
            DebugLogger.log('👆 Swipe left detected');
            this.dispatchSwipeEvent('swipeleft', e);
        },
        
        dispatchSwipeEvent(type, originalEvent) {
            const swipeEvent = new CustomEvent(type, {
                detail: { originalEvent },
                bubbles: true,
                cancelable: true
            });
            originalEvent.target.dispatchEvent(swipeEvent);
        }
    };

    // Orientation handling
    const OrientationManager = {
        init() {
            this.handleOrientationChange();
            window.addEventListener('orientationchange', () => {
                setTimeout(() => this.handleOrientationChange(), 500);
            });
        },
        
        handleOrientationChange() {
            const orientation = iPadDetection.isLandscape() ? 'landscape' : 'portrait';
            document.body.setAttribute('data-orientation', orientation);
            
            DebugLogger.log('📱 Orientation changed to:', orientation);
            
            // Dispatch custom event
            window.dispatchEvent(new CustomEvent('orientationChanged', {
                detail: { orientation, isIPad: iPadDetection.isIPad }
            }));
            
            // Force layout recalculation
            this.forceReflow();
        },
        
        forceReflow() {
            // Force browser to recalculate layout after orientation change
            document.body.style.height = '100.1%';
            setTimeout(() => {
                document.body.style.height = '';
            }, 50);
        }
    };

    // Scroll optimizations
    const ScrollOptimization = {
        init() {
            this.setupSmoothScrolling();
            this.setupScrollRestoration();
        },
        
        setupSmoothScrolling() {
            // Ensure smooth scrolling on iOS
            document.documentElement.style.webkitOverflowScrolling = 'touch';
        },
        
        setupScrollRestoration() {
            // Maintain scroll position on page transitions
            window.addEventListener('beforeunload', () => {
                sessionStorage.setItem('scrollPosition', window.pageYOffset);
            });
            
            window.addEventListener('load', () => {
                const scrollPosition = sessionStorage.getItem('scrollPosition');
                if (scrollPosition) {
                    window.scrollTo(0, parseInt(scrollPosition));
                    sessionStorage.removeItem('scrollPosition');
                }
            });
        }
    };

    // Performance optimizations for iPad
    const PerformanceOptimizer = {
        init() {
            this.optimizeAnimations();
            this.optimizeImages();
        },
        
        optimizeAnimations() {
            // Reduce animations on slower devices
            if (iPadDetection.isIPad) {
                document.documentElement.style.setProperty('--animation-duration', '0.2s');
            }
        },
        
        optimizeImages() {
            // Lazy load images for better performance
            const images = document.querySelectorAll('img[data-src]');
            if ('IntersectionObserver' in window) {
                const imageObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            imageObserver.unobserve(img);
                        }
                    });
                });
                
                images.forEach(img => imageObserver.observe(img));
            }
        }
    };

    // Initialize all iPad enhancements
    function initIPadEnhancements() {
        if (!iPadDetection.isIPad) {
            DebugLogger.log('📱 Not an iPad, skipping iPad-specific enhancements');
            return;
        }
        
        DebugLogger.log('🍎 Initializing iPad enhancements...');
        
        VirtualKeyboard.init();
        TouchGestures.init();
        OrientationManager.init();
        ScrollOptimization.init();
        PerformanceOptimizer.init();
        
        // Add iPad class to body for CSS targeting
        document.body.classList.add('ipad-device');
        
        DebugLogger.log('✅ iPad enhancements initialized');
    }

    // Export for global use
    window.iPadEnhancements = {
        detection: iPadDetection,
        virtualKeyboard: VirtualKeyboard,
        touchGestures: TouchGestures,
        orientation: OrientationManager,
        scroll: ScrollOptimization,
        performance: PerformanceOptimizer,
        init: initIPadEnhancements
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initIPadEnhancements);
    } else {
        initIPadEnhancements();
    }

})();