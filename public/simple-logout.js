// Simple logout functionality for Déconnexion button
document.addEventListener('DOMContentLoaded', () => {
    const authLink = document.getElementById('authLink');
    
    if (authLink && authLink.textContent.trim() === 'Déconnexion') {
        // Change the href to prevent default navigation
        authLink.href = '#';
        
        // Add logout functionality
        authLink.addEventListener('click', async (e) => {
            e.preventDefault();
            
            try {
                console.log('🔓 Simple logout starting...');
                
                // Use comprehensive logout if available, otherwise fallback to basic
                if (window.comprehensiveLogout) {
                    await window.comprehensiveLogout();
                } else {
                    console.log('⚠️ Comprehensive logout not available, using fallback');
                    
                    // Basic fallback clearing
                    if (window.SafariSession) window.SafariSession.clear();
                    if (window.SafeStorage) window.SafeStorage.clear();
                    localStorage.clear();
                    sessionStorage.clear();
                    if (window.auth) await window.auth.signOut();
                }
                
                console.log('✅ Simple logout successful');
                
                // Show success message
                alert('Déconnexion réussie!');
                
                // Redirect to login page
                window.location.href = '/login.html';
                
            } catch (error) {
                console.error('❌ Logout error:', error);
                alert('Erreur lors de la déconnexion: ' + error.message);
            }
        });
        
        // Style the logout button
        authLink.style.color = '#ff4444';
        authLink.style.fontWeight = 'bold';
        
        console.log('🔧 Déconnexion button configured');
    }
}); 