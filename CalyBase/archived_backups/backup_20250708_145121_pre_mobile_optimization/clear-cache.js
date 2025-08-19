// Cache clearing utility for Firebase version conflicts
// This helps resolve persistence issues when Firebase SDK versions change

window.clearFirebaseCache = async function() {
    console.log('🧹 Starting Firebase cache cleanup...');
    
    try {
        // Clear localStorage
        localStorage.clear();
        console.log('✅ localStorage cleared');
        
        // Clear sessionStorage
        sessionStorage.clear();
        console.log('✅ sessionStorage cleared');
        
        // Clear IndexedDB databases
        if ('indexedDB' in window) {
            const databases = [
                'firestore',
                'firebase-heartbeat-database',
                'firebase-installations-database'
            ];
            
            for (const dbName of databases) {
                try {
                    const deleteReq = indexedDB.deleteDatabase(dbName);
                    await new Promise((resolve, reject) => {
                        deleteReq.onsuccess = () => {
                            console.log(`✅ Cleared IndexedDB: ${dbName}`);
                            resolve();
                        };
                        deleteReq.onerror = () => {
                            console.log(`⚠️ Could not clear IndexedDB: ${dbName}`);
                            resolve(); // Don't fail on individual DB errors
                        };
                        deleteReq.onblocked = () => {
                            console.log(`⚠️ IndexedDB deletion blocked: ${dbName} (close other tabs)`);
                            resolve();
                        };
                    });
                } catch (error) {
                    console.log(`⚠️ Error clearing ${dbName}:`, error);
                }
            }
        }
        
        // Clear Service Worker cache if available
        if ('caches' in window) {
            try {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(cacheName => {
                        console.log(`🗑️ Clearing cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    })
                );
                console.log('✅ Service Worker caches cleared');
            } catch (error) {
                console.log('⚠️ Error clearing Service Worker caches:', error);
            }
        }
        
        console.log('🎉 Firebase cache cleanup complete!');
        console.log('💡 Please refresh the page to apply changes');
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4caf50;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-weight: bold;
            max-width: 300px;
        `;
        successMessage.innerHTML = `
            ✅ Cache nettoyé avec succès!<br>
            <small>Actualisez la page pour appliquer les changements</small>
            <br><br>
            <button id="reloadNowBtn" style="
                background: white;
                color: #4caf50;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
                margin-top: 5px;
            ">Actualiser maintenant</button>
        `;
        document.body.appendChild(successMessage);
        
        // Add event listener for reload button
        const reloadBtn = document.getElementById('reloadNowBtn');
        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => window.location.reload());
        }
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (successMessage.parentNode) {
                successMessage.remove();
            }
        }, 10000);
        
        return true;
        
    } catch (error) {
        console.error('❌ Error during cache cleanup:', error);
        
        // Show error message
        const errorMessage = document.createElement('div');
        errorMessage.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4444;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-weight: bold;
            max-width: 300px;
        `;
        errorMessage.innerHTML = `
            ❌ Erreur lors du nettoyage<br>
            <small>${error.message}</small>
        `;
        document.body.appendChild(errorMessage);
        
        setTimeout(() => {
            if (errorMessage.parentNode) {
                errorMessage.remove();
            }
        }, 5000);
        
        return false;
    }
};

// Auto-clear cache if there are known issues
document.addEventListener('DOMContentLoaded', () => {
    // Check for signs of Firebase version conflicts
    const hasVersionConflict = localStorage.getItem('firebase-version-conflict') === 'true';
    const hasOldFirestoreData = Object.keys(localStorage).some(key => 
        key.includes('firebase') || key.includes('firestore')
    );
    
    if (hasVersionConflict || (hasOldFirestoreData && window.location.search.includes('clearCache'))) {
        console.log('🔄 Auto-clearing cache due to detected conflicts...');
        setTimeout(() => window.clearFirebaseCache(), 1000);
    }
});

// Global error handler for Firebase persistence issues
window.addEventListener('error', (event) => {
    if (event.error && event.error.message && 
        (event.error.message.includes('persisted data is not compatible') ||
         event.error.message.includes('failed-precondition'))) {
        console.log('🚨 Firebase version conflict detected, marking for cache clear');
        localStorage.setItem('firebase-version-conflict', 'true');
    }
});

// Console helper - users can type clearFirebaseCache() in browser console
console.log('💡 Firebase Cache Utility Loaded');
console.log('🔧 To manually clear cache, type: clearFirebaseCache()');
console.log('🔄 To clear cache and reload, add ?clearCache=true to URL'); 