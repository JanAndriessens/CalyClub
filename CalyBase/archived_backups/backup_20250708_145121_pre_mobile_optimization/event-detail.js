// Variables globales
let eventId;
let allMembers = [];
let currentSort = { field: 'nom', direction: 'asc' };
let currentSortParticipants = { field: 'nom', direction: 'asc' };
let searchTerm = '';
let searchTermParticipants = '';

// Debounce timers
let searchDebounceTimer;
let participantSearchDebounceTimer;

// DOM Elements
const eventDescriptionEdit = document.getElementById('eventDescriptionEdit');
const eventDateEdit = document.getElementById('eventDateEdit');
const editEventBtn = document.getElementById('editEventBtn');

let isEditing = false;

// ⚡ OPTIMIZED: Fast Firebase initialization with reduced timeout
async function waitForFirebaseReady() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 30; // REDUCED: 3 seconds instead of 5
        
        const checkFirebase = () => {
            attempts++;
            
            if (typeof firebase !== 'undefined' && 
                firebase.apps && 
                firebase.apps.length > 0 && 
                window.db && 
                window.auth) {
                console.log('✅ Event Detail: Firebase services ready');
                resolve();
                return;
            }
            
            if (attempts >= maxAttempts) {
                console.warn('⚠️ Event Detail: Firebase timeout (3s), proceeding anyway');
                resolve(); // Don't reject, just warn and continue
                return;
            }
            
            setTimeout(checkFirebase, 100);
        };
        
        checkFirebase();
    });
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🎯 Event Detail: Initializing...');
        
        // Wait for Firebase to be ready
        await waitForFirebaseReady();
        
        console.log('✅ Event Detail: Firebase ready');
        
        // Récupérer l'ID de l'événement depuis l'URL
        const urlParams = new URLSearchParams(window.location.search);
        eventId = urlParams.get('id');
        
        if (!eventId) {
            alert('ID de l\'événement non trouvé');
            window.location.href = '/events.html';
            return;
        }

        // ⚡ OPTIMIZATION: Parallel loading for better performance
        const [eventData] = await Promise.all([
            loadEventData(),
            // Start participants and members loading in parallel
            loadParticipants(eventId).catch(error => console.warn('Participants loading failed:', error)),
            loadMembers().catch(error => console.warn('Members loading failed:', error))
        ]);

        // Configurer les écouteurs d'événements (immediate)
        setupEventListeners();
        
        console.log('✅ Event Detail: Initialization complete');
    } catch (error) {
        console.error('❌ Event Detail: Error during initialization:', error);
        alert('Erreur lors de l\'initialisation de la page');
    }
});

// Fonction pour charger les données de l'événement
async function loadEventData() {
    try {
        const eventDoc = await window.db.collection('events').doc(eventId).get();
        if (!eventDoc.exists) {
            alert('Événement non trouvé');
            window.location.href = '/events.html';
            return;
        }

        const event = eventDoc.data();
        
        // Mettre à jour l'interface
        document.getElementById('eventDescription').textContent = event.description || 'Pas de description';
        document.getElementById('eventDate').textContent = event.date ? new Date(event.date.seconds * 1000).toLocaleDateString('fr-FR') : 'Date non définie';
    } catch (error) {
        console.error('Erreur lors du chargement des données de l\'événement:', error);
        alert('Erreur lors du chargement des données de l\'événement');
    }
}

// Fonction pour charger les participants avec performance optimisée
async function loadParticipants(eventId) {
    try {
        const eventDoc = await window.db.collection('events').doc(eventId).get();
        const event = eventDoc.data();
        const participantsList = document.getElementById('participantsList');
        
        // Affichage immédiat du message de chargement
        participantsList.innerHTML = '<div class="loading-message">Chargement des participants...</div>';

        if (event.participants && event.participants.length > 0) {
            // ⚡ OPTIMIZATION: Batch query instead of individual queries
            console.log('📦 Batch loading participant data for', event.participants.length, 'participants...');
            
            // Get all unique lifrasIDs
            const lifrasIDs = [...new Set(event.participants.map(p => p.lifrasid).filter(id => id))];
            
            // ⚡ Single batch query for all members
            const membersMap = new Map();
            if (lifrasIDs.length > 0) {
                try {
                    // Firestore 'in' query supports up to 10 items
                    const batchSize = 10;
                    const batches = [];
                    
                    for (let i = 0; i < lifrasIDs.length; i += batchSize) {
                        const batch = lifrasIDs.slice(i, i + batchSize);
                        batches.push(
                            window.db.collection('membres')
                                .where('lifrasID', 'in', batch)
                                .get()
                        );
                    }
                    
                    const batchResults = await Promise.all(batches);
                    batchResults.forEach(snapshot => {
                        snapshot.docs.forEach(doc => {
                            const data = doc.data();
                            membersMap.set(data.lifrasID, data);
                        });
                    });
                    
                    console.log('✅ Loaded member data for', membersMap.size, 'participants');
                } catch (error) {
                    console.error('❌ Batch member loading failed:', error);
                }
            }
            
            // ⚡ Combine participant data with member data
            const participantsWithData = event.participants.map(participant => {
                const memberData = membersMap.get(participant.lifrasid) || {};
                return {
                    ...participant,
                    prenom: memberData.prenom || '',
                    nom: memberData.nom || '',
                    lifrasID: memberData.lifrasID || participant.lifrasid
                };
            });

                    // Trier les participants
        participantsWithData.sort((a, b) => {
            let aValue = '';
            let bValue = '';
            
            if (currentSortParticipants.field === 'nom') {
                aValue = a.nom || '';
                bValue = b.nom || '';
            } else if (currentSortParticipants.field === 'prenom') {
                aValue = a.prenom || '';
                bValue = b.prenom || '';
            }
            
            if (currentSortParticipants.direction === 'asc') {
                return aValue.localeCompare(bValue, 'fr', { sensitivity: 'base' });
            } else {
                return bValue.localeCompare(aValue, 'fr', { sensitivity: 'base' });
            }
        });

            // Filtrer les participants selon le terme de recherche
            const filteredParticipants = searchTermParticipants
                ? participantsWithData.filter(p => 
                    (p.prenom && p.prenom.toLowerCase().includes(searchTermParticipants.toLowerCase())) ||
                    (p.nom && p.nom.toLowerCase().includes(searchTermParticipants.toLowerCase())) ||
                    (p.lifrasid && p.lifrasid.toLowerCase().includes(searchTermParticipants.toLowerCase())))
                : participantsWithData;

            // Affichage immédiat avec avatars par défaut
            displayParticipants(filteredParticipants);
            
            // Chargement des avatars en parallèle (sans bloquer l'affichage)
            loadParticipantAvatarsAsync(filteredParticipants);
        } else {
            participantsList.innerHTML = '<div class="no-participants">Aucun participant</div>';
        }
    } catch (error) {
        console.error('Erreur lors du chargement des participants:', error);
        participantsList.innerHTML = '<div class="error">Erreur lors du chargement des participants</div>';
    }
}

// Fonction pour charger les membres avec performance optimisée
async function loadMembers() {
    try {
        // Récupérer d'abord la liste des participants
        const eventDoc = await window.db.collection('events').doc(eventId).get();
        const event = eventDoc.data();
        const participants = event.participants || [];

        // Récupérer tous les membres
        const membersSnapshot = await window.db.collection('membres').get();
        const membersList = document.getElementById('membersList');
        
        // Affichage immédiat du message de chargement
        membersList.innerHTML = '<div class="loading-message">Chargement des membres...</div>';

        // Stocker tous les membres non participants
        allMembers = [];
        membersSnapshot.forEach(doc => {
            const memberData = doc.data();
            const lifrasid = memberData.lifrasID || '';

            if (!lifrasid) {
                console.warn('Membre sans LIFRAS ID:', memberData);
                return;
            }

            // Vérifier si le membre n'est pas déjà participant
            if (!participants.some(p => p.lifrasid === lifrasid)) {
                const member = {
                    lifrasid: lifrasid,
                    prenom: memberData.prenom || '',
                    nom: memberData.nom || '',
                    lifrasID: memberData.lifrasID
                };
                allMembers.push(member);
            }
        });

        // Trier les membres
        allMembers.sort((a, b) => {
            let aValue = '';
            let bValue = '';
            
            if (currentSort.field === 'nom') {
                aValue = a.nom || '';
                bValue = b.nom || '';
            } else if (currentSort.field === 'prenom') {
                aValue = a.prenom || '';
                bValue = b.prenom || '';
            }
            
            if (currentSort.direction === 'asc') {
                return aValue.localeCompare(bValue, 'fr', { sensitivity: 'base' });
            } else {
                return bValue.localeCompare(aValue, 'fr', { sensitivity: 'base' });
            }
        });

        // Filtrer les membres selon le terme de recherche
        const filteredMembers = searchTerm
            ? allMembers.filter(m => 
                (m.prenom && m.prenom.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (m.nom && m.nom.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (m.lifrasid && m.lifrasid.toLowerCase().includes(searchTerm.toLowerCase())))
            : allMembers;

        // Affichage immédiat avec avatars par défaut
        displayMembers(filteredMembers);
        
        // Chargement des avatars en parallèle (sans bloquer l'affichage)
        loadMemberAvatarsAsync(filteredMembers);
    } catch (error) {
        console.error('Erreur lors du chargement des membres:', error);
        membersList.innerHTML = '<div class="error">Erreur lors du chargement des membres</div>';
    }
}

// Chargement asynchrone des avatars pour les participants
async function loadParticipantAvatarsAsync(participants) {
    try {
        const avatarPromises = participants.map(async (participant) => {
            try {
                const snapshot = await window.db.collection('avatars')
                    .where('lifrasID', '==', participant.lifrasID)
                    .limit(1)
                    .get();

                let photoURL = '/avatars/default-avatar.svg';
                if (!snapshot.empty) {
                    const avatarData = snapshot.docs[0].data();
                    if (avatarData.photoURL) {
                        photoURL = avatarData.photoURL;
                    }
                }

                return { lifrasID: participant.lifrasID, photoURL };
            } catch (error) {
                console.error('Erreur avatar participant:', error);
                return { lifrasID: participant.lifrasID, photoURL: '/avatars/default-avatar.svg' };
            }
        });

        const avatarResults = await Promise.all(avatarPromises);
        
        // Mettre à jour les avatars dans le DOM
        avatarResults.forEach(result => {
            const participantCard = document.querySelector(`[data-lifras-id="${result.lifrasID}"]`);
            if (participantCard) {
                const avatarImg = participantCard.querySelector('.participant-avatar img');
                if (avatarImg) {
                    avatarImg.src = result.photoURL;
                }
            }
        });
    } catch (error) {
        console.error('Erreur lors du chargement des avatars des participants:', error);
    }
}

// Chargement asynchrone des avatars pour les membres
async function loadMemberAvatarsAsync(members) {
    try {
        const avatarPromises = members.map(async (member) => {
            try {
                const snapshot = await window.db.collection('avatars')
                    .where('lifrasID', '==', member.lifrasID)
                    .limit(1)
                    .get();

                let photoURL = '/avatars/default-avatar.svg';
                if (!snapshot.empty) {
                    const avatarData = snapshot.docs[0].data();
                    if (avatarData.photoURL) {
                        photoURL = avatarData.photoURL;
                    }
                }

                return { lifrasID: member.lifrasID, photoURL };
            } catch (error) {
                console.error('Erreur avatar membre:', error);
                return { lifrasID: member.lifrasID, photoURL: '/avatars/default-avatar.svg' };
            }
        });

        const avatarResults = await Promise.all(avatarPromises);
        
        // Mettre à jour les avatars dans le DOM
        avatarResults.forEach(result => {
            const memberCard = document.querySelector(`[data-lifras-id-member="${result.lifrasID}"]`);
            if (memberCard) {
                const avatarImg = memberCard.querySelector('.member-avatar img');
                if (avatarImg) {
                    avatarImg.src = result.photoURL;
                }
            }
        });
    } catch (error) {
        console.error('Erreur lors du chargement des avatars des membres:', error);
    }
}

// Fonction pour configurer les écouteurs d'événements avec debounce
function setupEventListeners() {
    // Retour button
    document.getElementById('backButton').addEventListener('click', () => {
        window.history.back();
    });

    // Écouteurs pour la recherche avec debounce (100ms)
    document.getElementById('memberSearch').addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimer);
        const newSearchTerm = e.target.value;
        
        searchDebounceTimer = setTimeout(() => {
            searchTerm = newSearchTerm;
            loadMembers();
        }, 100);
    });

    document.getElementById('participantSearch').addEventListener('input', (e) => {
        clearTimeout(participantSearchDebounceTimer);
        const newSearchTerm = e.target.value;
        
        participantSearchDebounceTimer = setTimeout(() => {
            searchTermParticipants = newSearchTerm;
            loadParticipants(eventId);
        }, 100);
    });

    // Écouteurs pour le tri
    document.querySelectorAll('.sort-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.sort-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const field = button.dataset.sort;
            if (currentSort.field === field) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.field = field;
                currentSort.direction = 'asc';
            }
            loadMembers();
        });
    });

    document.querySelectorAll('.sort-button-participants').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.sort-button-participants').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const field = button.dataset.sort;
            if (currentSortParticipants.field === field) {
                currentSortParticipants.direction = currentSortParticipants.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortParticipants.field = field;
                currentSortParticipants.direction = 'asc';
            }
            loadParticipants(eventId);
        });
    });
}

// Fonction pour ajouter un participant
async function addParticipant(member) {
    try {
        const eventRef = window.db.collection('events').doc(eventId);
        const eventDoc = await eventRef.get();
        const event = eventDoc.data();
        
        // Vérifier si le membre n'est pas déjà participant
        if (event.participants && event.participants.some(p => p.lifrasid === member.lifrasid)) {
            alert('Ce membre est déjà participant à l\'événement');
            return;
        }
        
        // Ajouter le participant
        await eventRef.update({
            participants: firebase.firestore.FieldValue.arrayUnion({
                lifrasid: member.lifrasid
            })
        });
        
        // Recharger les listes
        await loadParticipants(eventId);
        await loadMembers();
    } catch (error) {
        console.error('Erreur lors de l\'ajout du participant:', error);
        alert('Erreur lors de l\'ajout du participant');
    }
}

// Fonction pour supprimer un participant
async function removeParticipant(lifrasid) {
    try {
        const eventRef = window.db.collection('events').doc(eventId);
        const eventDoc = await eventRef.get();
        const event = eventDoc.data();
        
        // Trouver le participant à supprimer
        const participant = event.participants.find(p => p.lifrasid === lifrasid);
        if (!participant) {
            alert('Participant non trouvé');
            return;
        }
        
        // Supprimer le participant
        await eventRef.update({
            participants: firebase.firestore.FieldValue.arrayRemove(participant)
        });
        
        // Recharger les listes
        await loadParticipants(eventId);
        await loadMembers();
    } catch (error) {
        console.error('Erreur lors de la suppression du participant:', error);
        alert('Erreur lors de la suppression du participant');
    }
}

// Fonction pour éditer l'événement
function editEvent() {
    const description = prompt('Nouvelle description:', document.getElementById('eventDescription').textContent);
    if (description === null) return;

    const date = prompt('Nouvelle date (JJ/MM/AAAA):', document.getElementById('eventDate').textContent);
    if (date === null) return;

    try {
        const [day, month, year] = date.split('/');
        const newDate = new Date(year, month - 1, day);

        window.db.collection('events').doc(eventId).update({
            description: description,
            date: firebase.firestore.Timestamp.fromDate(newDate)
        }).then(() => {
            loadEventData();
        }).catch(error => {
            console.error('Erreur lors de la mise à jour:', error);
            alert('Erreur lors de la mise à jour de l\'événement');
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        alert('Format de date invalide');
    }
}

// Affichage immédiat des participants avec avatars par défaut
function displayParticipants(participants) {
    const participantsList = document.getElementById('participantsList');
    participantsList.innerHTML = '';

    if (participants.length === 0) {
        participantsList.innerHTML = '<div class="no-participants">Aucun participant trouvé</div>';
        return;
    }

    participants.forEach(participant => {
        const participantCard = document.createElement('div');
        participantCard.className = 'participant-card';
        participantCard.setAttribute('data-lifras-id', participant.lifrasID);
        
        // Créer l'élément pour l'avatar
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'participant-avatar';
        
        // Créer l'image de l'avatar avec image par défaut immédiate
        const avatarImg = document.createElement('img');
        avatarImg.src = '/avatars/default-avatar.svg'; // Image par défaut immédiate
        avatarImg.alt = `${participant.prenom} ${participant.nom}`;
        avatarImg.onerror = () => {
            avatarImg.src = '/avatars/default-avatar.svg';
        };

        avatarDiv.appendChild(avatarImg);
        
        // Créer le contenu de la carte
        const contentDiv = document.createElement('div');
        contentDiv.className = 'participant-content';
        contentDiv.innerHTML = `
            <h3>${participant.prenom} ${participant.nom}</h3>
        `;
        
        // Créer le bouton de suppression
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-participant';
        removeButton.innerHTML = '<i class="fas fa-times"></i>';
        removeButton.onclick = () => removeParticipant(participant.lifrasid);
        
        // Assembler la carte
        participantCard.appendChild(avatarDiv);
        participantCard.appendChild(contentDiv);
        participantCard.appendChild(removeButton);
        
        participantsList.appendChild(participantCard);
    });
}

// Affichage immédiat des membres avec avatars par défaut
function displayMembers(members) {
    const membersList = document.getElementById('membersList');
    membersList.innerHTML = '';

    if (members.length === 0) {
        membersList.innerHTML = '<div class="no-members">Aucun membre disponible</div>';
        return;
    }

    members.forEach(member => {
        const memberCard = document.createElement('div');
        memberCard.className = 'member-card';
        memberCard.setAttribute('data-lifras-id-member', member.lifrasID);
        
        // Créer l'élément pour l'avatar
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'member-avatar';
        
        // Créer l'image de l'avatar avec image par défaut immédiate
        const avatarImg = document.createElement('img');
        avatarImg.src = '/avatars/default-avatar.svg'; // Image par défaut immédiate
        avatarImg.alt = `${member.prenom} ${member.nom}`;
        avatarImg.onerror = () => {
            avatarImg.src = '/avatars/default-avatar.svg';
        };

        avatarDiv.appendChild(avatarImg);
        
        // Créer le contenu de la carte
        const contentDiv = document.createElement('div');
        contentDiv.className = 'member-content';
        contentDiv.innerHTML = `
            <h3>${member.prenom} ${member.nom}</h3>
        `;
        
        // Créer le bouton d'ajout
        const addButton = document.createElement('button');
        addButton.className = 'add-participant';
        addButton.innerHTML = '<i class="fas fa-plus"></i>';
        addButton.onclick = () => addParticipant(member);
        
        // Assembler la carte
        memberCard.appendChild(avatarDiv);
        memberCard.appendChild(contentDiv);
        memberCard.appendChild(addButton);
        
        membersList.appendChild(memberCard);
    });
} 