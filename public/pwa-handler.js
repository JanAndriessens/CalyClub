// PWA Handler - Service Worker Registration and Install Prompt
(function() {
  'use strict';

  // Check if browser supports service workers
  if ('serviceWorker' in navigator) {
    // Register service worker
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('[PWA] ServiceWorker registered successfully:', registration.scope);
          
          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60000); // Check every minute

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available
                showUpdateNotification();
              }
            });
          });
        })
        .catch(error => {
          console.error('[PWA] ServiceWorker registration failed:', error);
        });
    });

    // Handle controller change
    let refreshing;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      window.location.reload();
      refreshing = true;
    });
  }

  // Install prompt handling
  let deferredPrompt;
  let installButton;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show install button
    showInstallPromotion();
  });

  function showInstallPromotion() {
    // Create or show existing install button
    installButton = document.getElementById('pwa-install-button');
    
    if (!installButton) {
      // Create install banner
      const banner = document.createElement('div');
      banner.id = 'pwa-install-banner';
      banner.className = 'pwa-install-banner';
      banner.innerHTML = `
        <div class="pwa-install-content">
          <div class="pwa-install-text">
            <strong>Install CalyClub</strong>
            <span>Add to home screen for quick access</span>
          </div>
          <div class="pwa-install-actions">
            <button id="pwa-install-button" class="pwa-install-btn">Install</button>
            <button id="pwa-install-dismiss" class="pwa-dismiss-btn">×</button>
          </div>
        </div>
      `;
      
      // Add styles
      const style = document.createElement('style');
      style.textContent = `
        .pwa-install-banner {
          position: fixed;
          bottom: 20px;
          left: 20px;
          right: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          padding: 16px;
          z-index: 9999;
          animation: slideUp 0.3s ease-out;
          max-width: 400px;
          margin: 0 auto;
        }
        
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .pwa-install-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        
        .pwa-install-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .pwa-install-text strong {
          font-size: 16px;
          color: #333;
        }
        
        .pwa-install-text span {
          font-size: 14px;
          color: #666;
        }
        
        .pwa-install-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        .pwa-install-btn {
          background: #0066cc;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          font-size: 14px;
        }
        
        .pwa-install-btn:hover {
          background: #0052a3;
        }
        
        .pwa-dismiss-btn {
          background: transparent;
          border: none;
          font-size: 24px;
          color: #999;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .pwa-dismiss-btn:hover {
          color: #666;
        }
        
        /* iOS Install Instructions */
        .ios-install-prompt {
          position: fixed;
          bottom: 20px;
          left: 20px;
          right: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          padding: 20px;
          z-index: 9999;
          max-width: 400px;
          margin: 0 auto;
        }
        
        .ios-install-content {
          text-align: center;
        }
        
        .ios-install-content h3 {
          margin-bottom: 12px;
          color: #333;
        }
        
        .ios-install-steps {
          text-align: left;
          margin: 16px 0;
          line-height: 1.8;
        }
        
        .ios-install-steps li {
          margin-bottom: 8px;
        }
        
        .ios-close-btn {
          background: #0066cc;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          width: 100%;
          margin-top: 12px;
        }
        
        @media (max-width: 768px) {
          .pwa-install-banner,
          .ios-install-prompt {
            left: 10px;
            right: 10px;
            bottom: 10px;
          }
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(banner);
      
      // Set up event listeners
      installButton = document.getElementById('pwa-install-button');
      const dismissButton = document.getElementById('pwa-install-dismiss');
      
      installButton.addEventListener('click', installPWA);
      dismissButton.addEventListener('click', () => {
        banner.remove();
        // Store dismissal in localStorage
        localStorage.setItem('pwa-install-dismissed', Date.now());
      });
    }
  }

  function installPWA() {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
        // Hide the install banner
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.remove();
      } else {
        console.log('[PWA] User dismissed the install prompt');
      }
      deferredPrompt = null;
    });
  }

  // iOS install instructions
  function showiOSInstallInstructions() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isInStandaloneMode = window.navigator.standalone === true;
    
    if (isIOS && !isInStandaloneMode) {
      // Check if already dismissed recently
      const dismissed = localStorage.getItem('ios-install-dismissed');
      if (dismissed && Date.now() - dismissed < 7 * 24 * 60 * 60 * 1000) {
        return; // Don't show for a week after dismissal
      }
      
      // Show iOS-specific instructions after a delay
      setTimeout(() => {
        const prompt = document.createElement('div');
        prompt.className = 'ios-install-prompt';
        prompt.innerHTML = `
          <div class="ios-install-content">
            <h3>Install CalyClub</h3>
            <p>Add CalyClub to your home screen for quick access:</p>
            <ol class="ios-install-steps">
              <li>Tap the Share button <span style="font-size: 20px;">⬆️</span></li>
              <li>Scroll down and tap "Add to Home Screen"</li>
              <li>Tap "Add" to confirm</li>
            </ol>
            <button class="ios-close-btn" onclick="this.parentElement.parentElement.remove(); localStorage.setItem('ios-install-dismissed', Date.now())">Got it!</button>
          </div>
        `;
        document.body.appendChild(prompt);
      }, 3000); // Show after 3 seconds
    }
  }

  // Show iOS instructions on load
  window.addEventListener('load', showiOSInstallInstructions);

  // Track installation
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App was installed');
    // Hide any install prompts
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.remove();
    
    // Track in analytics if available
    if (window.gtag) {
      window.gtag('event', 'pwa_install', {
        event_category: 'engagement',
        event_label: 'installed'
      });
    }
  });

  // Show update notification
  function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'pwa-update-notification';
    notification.innerHTML = `
      <div class="pwa-update-content">
        <span>A new version of CalyClub is available!</span>
        <button onclick="window.location.reload()">Update</button>
      </div>
    `;
    
    // Add update notification styles
    const style = document.createElement('style');
    style.textContent = `
      .pwa-update-notification {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideDown 0.3s ease-out;
      }
      
      @keyframes slideDown {
        from {
          transform: translateX(-50%) translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }
      
      .pwa-update-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .pwa-update-content button {
        background: white;
        color: #333;
        border: none;
        padding: 6px 12px;
        border-radius: 3px;
        cursor: pointer;
        font-weight: 500;
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);
    
    // Auto-hide after 10 seconds
    setTimeout(() => notification.remove(), 10000);
  }

  // Export for external use
  window.PWAHandler = {
    installPWA,
    showInstallPromotion,
    showiOSInstallInstructions
  };

})();