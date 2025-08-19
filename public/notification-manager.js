// Notification Manager for CalyBase PWA
class NotificationManager {
  constructor() {
    this.isSupported = 'Notification' in window;
    this.permission = this.isSupported ? Notification.permission : 'denied';
  }

  // Request notification permission
  async requestPermission() {
    if (!this.isSupported) {
      console.warn('Notifications not supported');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Show a simple notification
  showNotification(title, options = {}) {
    if (!this.isSupported || this.permission !== 'granted') {
      console.warn('Cannot show notification - permission not granted');
      return null;
    }

    const defaultOptions = {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      requireInteraction: false,
      ...options
    };

    try {
      return new Notification(title, defaultOptions);
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  // Show event reminder notification
  showEventReminder(event) {
    const options = {
      body: `Événement: ${event.title}\nDate: ${event.date}`,
      tag: 'event-reminder',
      actions: [
        {
          action: 'view',
          title: 'Voir l\'événement'
        },
        {
          action: 'dismiss',
          title: 'Ignorer'
        }
      ]
    };

    return this.showNotification('Rappel d\'événement', options);
  }

  // Show member update notification
  showMemberUpdate(member) {
    const options = {
      body: `Mise à jour du profil de ${member.name}`,
      tag: 'member-update',
      actions: [
        {
          action: 'view',
          title: 'Voir le profil'
        }
      ]
    };

    return this.showNotification('Membre mis à jour', options);
  }

  // Show payment notification
  showPaymentNotification(payment) {
    const options = {
      body: `Paiement ${payment.status}: ${payment.amount}€`,
      tag: 'payment-update',
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'Voir les détails'
        }
      ]
    };

    return this.showNotification('Notification de paiement', options);
  }

  // Show system notification
  showSystemNotification(message, type = 'info') {
    const options = {
      body: message,
      tag: 'system-notification'
    };

    const title = type === 'error' ? 'Erreur système' : 
                  type === 'warning' ? 'Attention' : 
                  'Information système';

    return this.showNotification(title, options);
  }

  // Schedule a notification (using setTimeout for demo)
  scheduleNotification(title, options, delay) {
    setTimeout(() => {
      this.showNotification(title, options);
    }, delay);
  }

  // Get permission status
  getPermissionStatus() {
    return {
      supported: this.isSupported,
      permission: this.permission,
      canRequest: this.permission === 'default'
    };
  }

  // Show in-app fallback notification if web notifications unavailable
  showInAppNotification(title, message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `in-app-notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <strong>${title}</strong>
        <p>${message}</p>
        <button onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    // Add styles if not already added
    if (!document.querySelector('#notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        .in-app-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          max-width: 350px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 10000;
          animation: slideInRight 0.3s ease-out;
        }
        
        .in-app-notification.info {
          border-left: 4px solid #0066cc;
        }
        
        .in-app-notification.success {
          border-left: 4px solid #28a745;
        }
        
        .in-app-notification.warning {
          border-left: 4px solid #ffc107;
        }
        
        .in-app-notification.error {
          border-left: 4px solid #dc3545;
        }
        
        .notification-content {
          padding: 16px;
          position: relative;
        }
        
        .notification-content strong {
          display: block;
          margin-bottom: 4px;
          color: #333;
        }
        
        .notification-content p {
          margin: 0;
          color: #666;
          font-size: 14px;
        }
        
        .notification-content button {
          position: absolute;
          top: 8px;
          right: 8px;
          background: none;
          border: none;
          font-size: 20px;
          color: #999;
          cursor: pointer;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @media (max-width: 768px) {
          .in-app-notification {
            left: 10px;
            right: 10px;
            top: 10px;
            max-width: none;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Add to page
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);

    return notification;
  }

  // Unified notification method (web notification with in-app fallback)
  notify(title, message, options = {}) {
    const type = options.type || 'info';
    
    if (this.permission === 'granted') {
      return this.showNotification(title, {
        body: message,
        ...options
      });
    } else {
      return this.showInAppNotification(title, message, type);
    }
  }

  // Test notifications
  async test() {
    console.log('Testing notifications...');
    
    const status = this.getPermissionStatus();
    console.log('Permission status:', status);

    if (status.canRequest) {
      const granted = await this.requestPermission();
      console.log('Permission granted:', granted);
    }

    if (this.permission === 'granted') {
      this.showNotification('Test CalyClub', {
        body: 'Les notifications fonctionnent !',
        tag: 'test'
      });
    } else {
      this.showInAppNotification('Test CalyClub', 'Notification de test (in-app)', 'info');
    }
  }
}

// Initialize notification manager
window.NotificationManager = new NotificationManager();

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationManager;
}