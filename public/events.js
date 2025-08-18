// Initialisation de Firestore
let eventsCollection;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Wait for Firebase to be initialized
        await waitForFirebase();
        
        if (!window.db) {
            throw new Error('Firestore n\'est pas disponible');
        }
        
        eventsCollection = window.db.collection('events');
        console.log('Firestore initialisé avec succès');
        await loadEvents();
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de Firestore:', error);
        showError('Erreur de connexion à la base de données: ' + error.message);
    }
});

// ⚡ OPTIMIZED: Fast Firebase initialization with reduced timeout
async function waitForFirebase() {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            console.warn('⚠️ Events: Firebase timeout (3s), proceeding anyway');
            resolve(); // Don't reject, just warn and continue
        }, 3000); // REDUCED: 3 seconds instead of 10

        const checkFirebase = setInterval(() => {
            if (window.db && window.auth) {
                clearInterval(checkFirebase);
                clearTimeout(timeout);
                console.log('✅ Events: Firebase ready');
                resolve();
            }
        }, 50); // Check more frequently
        
        // Also listen for the Firebase initialized event
        window.addEventListener('firebaseInitialized', () => {
            clearInterval(checkFirebase);
            clearTimeout(timeout);
            resolve();
        });
    });
}

// Show error message to user
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
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
        max-width: 400px;
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

// Éléments DOM
const eventsList = document.getElementById('eventsList');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const addEventButton = document.getElementById('addEventButton');
const eventTemplate = document.getElementById('eventTemplate');
const eventModal = document.getElementById('eventModal');
const eventForm = document.getElementById('eventForm');
const cancelEventButton = document.getElementById('cancelEvent');
const eventDateInput = document.getElementById('eventDate');
const eventDescriptionInput = document.getElementById('eventDescription');

// Initialiser la date par défaut à aujourd'hui
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
eventDateInput.value = `${year}-${month}-${day}`;
eventDescriptionInput.value = 'Piscine';

// Afficher la modale
addEventButton.addEventListener('click', () => {
    // Réinitialiser les valeurs par défaut
    eventDateInput.value = `${year}-${month}-${day}`;
    eventDescriptionInput.value = 'Piscine';
    eventModal.style.display = 'flex';
    eventDescriptionInput.focus();
});

// Fermer la modale
cancelEventButton.addEventListener('click', () => {
    eventModal.style.display = 'none';
    eventForm.reset();
});

// Fermer la modale en cliquant en dehors
eventModal.addEventListener('click', (e) => {
    if (e.target === eventModal) {
        eventModal.style.display = 'none';
        eventForm.reset();
    }
});

// Gérer la soumission du formulaire
eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!window.db || !eventsCollection) {
        console.error('Firestore n\'est pas initialisé');
        alert('Erreur de connexion à la base de données');
        return;
    }
    
    const description = document.getElementById('eventDescription').value;
    const date = new Date(document.getElementById('eventDate').value);
    
    try {
        console.log('Tentative de création d\'événement:', { description, date });
        
        // Créer un document avec un ID généré automatiquement
        const newEventRef = eventsCollection.doc();
        
        // Définir les données de l'événement
        const eventData = {
            description,
            date: firebase.firestore.Timestamp.fromDate(date),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        console.log('Données de l\'événement à créer:', eventData);
        
        await newEventRef.set(eventData);
        
        console.log('Événement créé avec succès, ID:', newEventRef.id);
        
        eventModal.style.display = 'none';
        eventForm.reset();
        await loadEvents(); // Recharger la liste des événements
    } catch (error) {
        console.error('Erreur détaillée lors de la création de l\'événement:', error);
        alert('Une erreur est survenue lors de la création de l\'événement: ' + error.message);
    }
});

// Charger les événements
async function loadEvents() {
    if (!window.db || !eventsCollection) {
        console.error('Firestore n\'est pas initialisé');
        return;
    }

    try {
        console.log('Tentative de chargement des événements');
        
        // Utiliser get() au lieu de onSnapshot pour le moment
        const querySnapshot = await eventsCollection
            .orderBy('date', 'desc')
            .get();
            
        console.log('Nombre d\'événements chargés:', querySnapshot.size);
        console.log('Événements trouvés:', querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })));
        
        eventsList.innerHTML = '';
        
        if (querySnapshot.empty) {
            console.log('Aucun événement trouvé dans la base de données');
            eventsList.innerHTML = '<div class="no-events">Aucun événement trouvé</div>';
            return;
        }
        
        querySnapshot.forEach(doc => {
            const event = doc.data();
            console.log('Création de l\'élément pour l\'événement:', doc.id, event);
            const eventElement = createEventElement(doc.id, event);
            eventsList.appendChild(eventElement);
        });
    } catch (error) {
        console.error('Erreur détaillée lors du chargement des événements:', error);
        alert('Erreur lors du chargement des événements: ' + error.message);
    }
}

// Créer un élément événement
function createEventElement(eventId, event) {
    const clone = eventTemplate.content.cloneNode(true);
    const eventCard = clone.querySelector('.event-card');
    
    // Formater la date
    const date = event.date ? new Date(event.date.seconds * 1000) : new Date();
    const formattedDate = date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    // Check if event is in the past (more than one day old)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    const eventDate = new Date(date);
    eventDate.setHours(0, 0, 0, 0); // Reset time to start of day
    
    if (eventDate < today) {
        eventCard.classList.add('past-event');
    }
    
    clone.querySelector('.event-date').textContent = formattedDate;
    clone.querySelector('.event-description').textContent = event.description || 'Pas de description';
    
    // Make entire event card clickable for better UX
    eventCard.style.cursor = 'pointer';
    eventCard.style.userSelect = 'none';
    eventCard.style.webkitUserSelect = 'none';
    eventCard.style.webkitTouchCallout = 'none';
    
    const navigateToEvent = (e) => {
        // Only navigate if not clicking on action buttons
        if (!e.target.closest('.event-actions')) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎯 Navigating to event detail from card:', eventId);
            window.location.href = `event-detail.html?id=${eventId}`;
        }
    };
    
    // Add touch-friendly event handling to entire card
    eventCard.addEventListener('click', navigateToEvent, { passive: false });
    eventCard.addEventListener('touchend', navigateToEvent, { passive: false });
    
    // Add visual feedback for card touch
    eventCard.addEventListener('touchstart', (e) => {
        if (!e.target.closest('.event-actions')) {
            eventCard.style.transform = 'scale(0.98)';
            eventCard.style.opacity = '0.9';
        }
    }, { passive: true });
    
    eventCard.addEventListener('touchcancel', (e) => {
        eventCard.style.transform = '';
        eventCard.style.opacity = '';
    }, { passive: true });
    
    eventCard.addEventListener('touchend', (e) => {
        setTimeout(() => {
            eventCard.style.transform = '';
            eventCard.style.opacity = '';
        }, 150);
    }, { passive: true });
    
    // Configurer les boutons avec support touch/click amélioré
    const editButton = clone.querySelector('.edit-button');
    if (editButton) {
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        
        // Edit button as backup navigation method
        const editButtonNavigate = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎯 Navigating to event detail from edit button:', eventId);
            window.location.href = `event-detail.html?id=${eventId}`;
        };
        
        // Remove any existing onclick to avoid conflicts
        editButton.onclick = null;
        
        // Add multiple event listeners for maximum compatibility
        editButton.addEventListener('click', editButtonNavigate, { passive: false });
        editButton.addEventListener('touchend', editButtonNavigate, { passive: false });
        
        // Add visual feedback for button touch
        editButton.addEventListener('touchstart', (e) => {
            e.stopPropagation(); // Prevent card touch feedback
            editButton.style.transform = 'scale(0.95)';
            editButton.style.opacity = '0.7';
        }, { passive: true });
        
        editButton.addEventListener('touchcancel', (e) => {
            editButton.style.transform = '';
            editButton.style.opacity = '';
        }, { passive: true });
        
        editButton.addEventListener('touchend', (e) => {
            setTimeout(() => {
                editButton.style.transform = '';
                editButton.style.opacity = '';
            }, 100);
        }, { passive: true });
        
        // Ensure button is touch-friendly
        editButton.style.minHeight = '44px';
        editButton.style.minWidth = '44px';
        editButton.style.cursor = 'pointer';
        editButton.style.userSelect = 'none';
        editButton.style.webkitUserSelect = 'none';
        editButton.style.webkitTouchCallout = 'none';
    }
    
    return clone;
}

// Éditer un événement
async function editEvent(eventId, event) {
    if (!window.db || !eventsCollection) {
        console.error('Firestore n\'est pas initialisé');
        return;
    }

    const description = prompt('Nouvelle description:', event.description);
    if (!description) return;
    
    const dateStr = prompt('Nouvelle date (JJ/MM/AAAA):', 
        event.date ? new Date(event.date.seconds * 1000).toLocaleDateString('fr-FR') : '');
    if (!dateStr) return;
    
    try {
        const [day, month, year] = dateStr.split('/');
        const date = new Date(year, month - 1, day);
        
        await eventsCollection.doc(eventId).update({
            description,
            date: firebase.firestore.Timestamp.fromDate(date)
        });
        
        await loadEvents();
    } catch (error) {
        console.error('Erreur lors de la modification de l\'événement:', error);
        alert('Erreur lors de la modification de l\'événement');
    }
}

// Supprimer un événement
async function deleteEvent(eventId) {
    if (!window.db || !eventsCollection) {
        console.error('Firestore n\'est pas initialisé');
        return;
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) return;
    
    try {
        await eventsCollection.doc(eventId).delete();
        await loadEvents();
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'événement:', error);
        alert('Erreur lors de la suppression de l\'événement');
    }
}

// Rechercher des événements
function searchEvents() {
    const searchTerm = searchInput.value.toLowerCase();
    const eventCards = eventsList.querySelectorAll('.event-card');
    
    eventCards.forEach(card => {
        const description = card.querySelector('.event-description').textContent.toLowerCase();
        const date = card.querySelector('.event-date').textContent.toLowerCase();
        
        if (description.includes(searchTerm) || date.includes(searchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

// Event listeners
searchButton.addEventListener('click', searchEvents);
searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') searchEvents();
}); 