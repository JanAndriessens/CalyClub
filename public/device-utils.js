// Device Detection Utility for CalyBase
// Centralized device detection to prevent code duplication

(function() {
    'use strict';

    // Device detection constants
    const MOBILE_REGEX = /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i;
    const TABLET_REGEX = /iPad|Android.*Tablet|Android.*Tab/i;
    const SAFARI_REGEX = /Safari/i;
    const WEBKIT_REGEX = /WebKit/i;
    const CHROME_REGEX = /Chrome/i;

    // Performance optimization constants  
    const TIMEOUTS = {
        FIREBASE_INIT_DESKTOP: 3000,
        FIREBASE_INIT_MOBILE: 5000,
        CHECK_INTERVAL_DESKTOP: 100,
        CHECK_INTERVAL_MOBILE: 250,
        MAX_ATTEMPTS_DESKTOP: 30,
        MAX_ATTEMPTS_MOBILE: 20
    };

    // Device detection functions
    const DeviceUtils = {
        // Core detection functions
        isMobile: () => MOBILE_REGEX.test(navigator.userAgent),
        isTablet: () => TABLET_REGEX.test(navigator.userAgent),
        isSafari: () => SAFARI_REGEX.test(navigator.userAgent) && WEBKIT_REGEX.test(navigator.userAgent) && !CHROME_REGEX.test(navigator.userAgent),
        
        // Computed properties
        get isMobileDevice() {
            return this.isMobile() || this.isTablet();
        },
        
        get isIPadSafari() {
            return this.isTablet() && this.isSafari();
        },
        
        // Performance optimization helpers
        get checkInterval() {
            return this.isMobileDevice ? TIMEOUTS.CHECK_INTERVAL_MOBILE : TIMEOUTS.CHECK_INTERVAL_DESKTOP;
        },
        
        get firebaseTimeout() {
            return this.isMobileDevice ? TIMEOUTS.FIREBASE_INIT_MOBILE : TIMEOUTS.FIREBASE_INIT_DESKTOP;
        },
        
        get maxAttempts() {
            return this.isMobileDevice ? TIMEOUTS.MAX_ATTEMPTS_MOBILE : TIMEOUTS.MAX_ATTEMPTS_DESKTOP;
        },
        
        // Device info object (compatible with existing window.deviceInfo)
        get deviceInfo() {
            return {
                isMobile: this.isMobile(),
                isTablet: this.isTablet(),
                isSafari: this.isSafari(),
                isIPadSafari: this.isIPadSafari,
                isMobileDevice: this.isMobileDevice,
                userAgent: navigator.userAgent
            };
        },
        
        // CSS class management
        addDeviceClasses: () => {
            if (DeviceUtils.isMobileDevice) {
                document.documentElement.classList.add('mobile-device');
                if (DeviceUtils.isIPadSafari) {
                    document.documentElement.classList.add('ipad-safari');
                }
            }
        },
        
        // Logging helper
        logDeviceInfo: () => {
            console.log('📱 Device Detection:', DeviceUtils.deviceInfo);
        }
    };

    // Make DeviceUtils globally available
    window.DeviceUtils = DeviceUtils;
    
    // Maintain compatibility with existing window.deviceInfo
    window.deviceInfo = DeviceUtils.deviceInfo;
    
    // Auto-add device classes and log info when loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            DeviceUtils.addDeviceClasses();
            DeviceUtils.logDeviceInfo();
        });
    } else {
        DeviceUtils.addDeviceClasses();
        DeviceUtils.logDeviceInfo();
    }

})(); 