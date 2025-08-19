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

// Fonction pour calculer le statut médical basé sur la validité du certificat
function calculateMedicalStatus(validiteCertificatMedical) {
    if (!validiteCertificatMedical || validiteCertificatMedical.trim() === '') {
        return 'INCONNU';
    }
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const validityDate = new Date(validiteCertificatMedical);
        validityDate.setHours(23, 59, 59, 999);
        if (isNaN(validityDate.getTime())) {
            return 'INCONNU';
        }
        return validityDate >= today ? 'OK' : 'PAS OK';
    } catch (error) {
        console.error('Erreur lors du calcul du statut médical:', error);
        return 'INCONNU';
    }
}

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
        console.log('🔍 [MEMBERS DEBUG] Starting loadMembers function');
        console.log('🔍 [MEMBERS DEBUG] eventId:', eventId);
        console.log('🔍 [MEMBERS DEBUG] window.db status:', !!window.db);
        
        // Check DOM element first
        const membersList = document.getElementById('membersList');
        if (!membersList) {
            throw new Error('membersList DOM element not found');
        }
        console.log('✅ [MEMBERS DEBUG] membersList DOM element found');
        
        // Affichage immédiat du message de chargement
        membersList.innerHTML = '<div class="loading-message">Chargement des membres...</div>';
        
        // Récupérer d'abord la liste des participants
        console.log('🔍 [MEMBERS DEBUG] Fetching event document...');
        const eventDoc = await window.db.collection('events').doc(eventId).get();
        if (!eventDoc.exists) {
            throw new Error(`Event document not found for ID: ${eventId}`);
        }
        
        const event = eventDoc.data();
        const participants = event.participants || [];
        console.log('✅ [MEMBERS DEBUG] Event loaded, participants count:', participants.length);

        // Récupérer tous les membres
        console.log('🔍 [MEMBERS DEBUG] Fetching members collection...');
        const membersSnapshot = await window.db.collection('membres').get();
        console.log('✅ [MEMBERS DEBUG] Members snapshot received, size:', membersSnapshot.size);

        // Stocker tous les membres non participants
        allMembers = [];
        let membersProcessed = 0;
        let membersFiltered = 0;
        let membersWithoutID = 0;
        
        console.log('🔍 [MEMBERS DEBUG] Processing members...');
        membersSnapshot.forEach(doc => {
            membersProcessed++;
            const memberData = doc.data();
            const lifrasid = memberData.lifrasID || '';

            if (!lifrasid) {
                membersWithoutID++;
                console.warn('🔍 [MEMBERS DEBUG] Membre sans LIFRAS ID:', memberData);
                return;
            }

            // Vérifier si le membre n'est pas déjà participant
            const isParticipant = participants.some(p => p.lifrasid === lifrasid);
            if (!isParticipant) {
                // Calculer le statut médical
                const medicalStatus = calculateMedicalStatus(memberData.validiteCertificatMedical);
                
                const member = {
                    lifrasid: lifrasid,
                    prenom: memberData.prenom || '',
                    nom: memberData.nom || '',
                    lifrasID: memberData.lifrasID,
                    validiteCertificatMedical: memberData.validiteCertificatMedical,
                    medicalStatus: medicalStatus
                };
                allMembers.push(member);
                
                // Log pour debug
                if (medicalStatus === 'PAS OK') {
                    console.log(`⚠️ Membre avec certificat expiré: ${memberData.prenom} ${memberData.nom} (${lifrasid}) - Validité: ${memberData.validiteCertificatMedical}`);
                }
            } else {
                membersFiltered++;
            }
        });
        
        console.log('✅ [MEMBERS DEBUG] Processing complete:');
        console.log('  - Total members processed:', membersProcessed);
        console.log('  - Members without ID:', membersWithoutID);
        console.log('  - Members already participants (filtered):', membersFiltered);
        console.log('  - Available members to add:', allMembers.length);

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
        console.log('🔍 [MEMBERS DEBUG] Filtering and displaying members...');
        console.log(`📋 [MEMBERS DEBUG] Filtered members count: ${filteredMembers.length}`);
        console.log(`📋 [MEMBERS DEBUG] Search term: "${searchTerm}"`);
        
        try {
            displayMembers(filteredMembers);
            console.log('✅ [MEMBERS DEBUG] displayMembers completed successfully');
        } catch (displayError) {
            console.error('❌ [MEMBERS DEBUG] Error in displayMembers:', displayError);
            throw displayError;
        }
        
        // Chargement des avatars en parallèle (sans bloquer l'affichage)
        console.log(`🖼️ [MEMBERS DEBUG] Starting avatar loading for ${filteredMembers.length} members`);
        loadMemberAvatarsAsync(filteredMembers).catch(error => {
            console.error('❌ [MEMBERS DEBUG] Avatar loading failed for members:', error);
        });
        
        console.log('✅ [MEMBERS DEBUG] loadMembers function completed successfully');
        
    } catch (error) {
        console.error('❌ [MEMBERS DEBUG] Critical error in loadMembers:', error);
        console.error('❌ [MEMBERS DEBUG] Error stack:', error.stack);
        
        // Try to get membersList again in case it was the issue
        const membersList = document.getElementById('membersList');
        if (membersList) {
            membersList.innerHTML = `<div class="error">Erreur lors du chargement des membres: ${error.message}</div>`;
        } else {
            console.error('❌ [MEMBERS DEBUG] Cannot even find membersList element for error display');
        }
        
        // Re-throw for higher-level error handling
        throw error;
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
        
        // Mettre à jour les avatars dans le DOM avec système robuste
        avatarResults.forEach(result => {
            const participantCard = document.querySelector(`[data-lifras-id="${result.lifrasID}"]`);
            if (participantCard) {
                const avatarImg = participantCard.querySelector('.participant-avatar img');
                if (avatarImg && window.AvatarUtils) {
                    // Update with robust system
                    window.AvatarUtils.setupRobustAvatar(avatarImg, result.photoURL, result.lifrasID, {
                        showLoading: false
                    });
                } else if (avatarImg) {
                    // Fallback
                    avatarImg.src = result.photoURL || '/avatars/default-avatar.svg';
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
        
        // Mettre à jour les avatars dans le DOM avec système robuste
        avatarResults.forEach(result => {
            const memberCard = document.querySelector(`[data-lifras-id-member="${result.lifrasID}"]`);
            if (memberCard) {
                const avatarImg = memberCard.querySelector('.member-avatar img');
                if (avatarImg && window.AvatarUtils) {
                    // Update with robust system
                    window.AvatarUtils.setupRobustAvatar(avatarImg, result.photoURL, result.lifrasID, {
                        showLoading: false
                    });
                } else if (avatarImg) {
                    // Fallback
                    avatarImg.src = result.photoURL || '/avatars/default-avatar.svg';
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
        // VALIDATION MÉDICALE STRICTE
        const medicalStatus = member.medicalStatus || calculateMedicalStatus(member.validiteCertificatMedical);
        
        if (medicalStatus === 'PAS OK') {
            alert(`❌ PARTICIPATION REFUSÉE\n\n` +
                  `Ce membre ne peut pas participer à l'événement.\n\n` +
                  `Membre: ${member.prenom} ${member.nom}\n` +
                  `Raison: Certificat médical expiré ou invalide\n` +
                  `Validité: ${member.validiteCertificatMedical || 'Non renseignée'}\n\n` +
                  `Action requise: Le membre doit renouveler son certificat médical valide pour pouvoir participer aux activités.`);
            return;
        }
        
        const eventRef = window.db.collection('events').doc(eventId);
        const eventDoc = await eventRef.get();
        const event = eventDoc.data();
        
        // Vérifier si le membre n'est pas déjà participant
        if (event.participants && event.participants.some(p => p.lifrasid === member.lifrasid)) {
            alert('Ce membre est déjà participant à l\'événement');
            return;
        }
        
        // Avertissement pour statut INCONNU
        if (medicalStatus === 'INCONNU') {
            const confirm = window.confirm(`⚠️ STATUT MÉDICAL INCONNU\n\n` +
                                         `Membre: ${member.prenom} ${member.nom}\n` +
                                         `Le statut médical de ce membre est inconnu.\n\n` +
                                         `Voulez-vous quand même l'ajouter comme participant ?\n` +
                                         `(Il est recommandé de vérifier son certificat médical d'abord)`);
            if (!confirm) {
                return;
            }
        }
        
        // Ajouter le participant
        await eventRef.update({
            participants: firebase.firestore.FieldValue.arrayUnion({
                lifrasid: member.lifrasid
            })
        });
        
        console.log(`✅ Participant ajouté: ${member.prenom} ${member.nom} (Statut médical: ${medicalStatus})`);
        
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
        
        // Créer l'image de l'avatar avec système robuste
        const avatarImg = document.createElement('img');
        avatarImg.alt = `${participant.prenom} ${participant.nom}`;
        
        // Utiliser le système robuste d'avatar si disponible
        if (window.AvatarUtils) {
            // Initial display with default avatar, will be updated by loadParticipantAvatarsAsync
            window.AvatarUtils.setupRobustAvatar(avatarImg, null, participant.lifrasID, {
                showLoading: false,
                onFallback: () => console.log(`🔄 Participant avatar fallback for ${participant.lifrasID}`)
            });
        } else {
            // Fallback basique
            avatarImg.src = '/avatars/default-avatar.svg';
            avatarImg.onerror = () => {
                avatarImg.src = '/avatars/default-avatar.svg';
            };
        }

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
    console.log('🔍 [DISPLAY DEBUG] Starting displayMembers with', members.length, 'members');
    
    const membersList = document.getElementById('membersList');
    if (!membersList) {
        throw new Error('membersList element not found in displayMembers');
    }
    
    membersList.innerHTML = '';

    if (members.length === 0) {
        console.log('🔍 [DISPLAY DEBUG] No members to display');
        membersList.innerHTML = '<div class="no-members">Aucun membre disponible</div>';
        return;
    }

    console.log('🔍 [DISPLAY DEBUG] Creating member cards...');
    let cardsCreated = 0;

    members.forEach((member, index) => {
        try {
            console.log(`🔍 [DISPLAY DEBUG] Processing member ${index + 1}/${members.length}:`, member.prenom, member.nom, `(Medical: ${member.medicalStatus})`);
        const memberCard = document.createElement('div');
        memberCard.className = 'member-card';
        memberCard.setAttribute('data-lifras-id-member', member.lifrasID);
        
        // Ajouter la classe pour les membres non éligibles
        if (member.medicalStatus === 'PAS OK') {
            memberCard.classList.add('medical-invalid');
        }
        
        // Créer l'élément pour l'avatar
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'member-avatar';
        
        // Créer l'image de l'avatar avec système robuste
        const avatarImg = document.createElement('img');
        avatarImg.alt = `${member.prenom} ${member.nom}`;
        
        // Utiliser le système robuste d'avatar si disponible
        if (window.AvatarUtils) {
            // Initial display with default avatar, will be updated by loadMemberAvatarsAsync
            window.AvatarUtils.setupRobustAvatar(avatarImg, null, member.lifrasID, {
                showLoading: false,
                onFallback: () => console.log(`🔄 Member avatar fallback for ${member.lifrasID}`)
            });
        } else {
            // Fallback basique
            avatarImg.src = '/avatars/default-avatar.svg';
            avatarImg.onerror = () => {
                avatarImg.src = '/avatars/default-avatar.svg';
            };
        }

        avatarDiv.appendChild(avatarImg);
        
        // Créer le contenu de la carte avec badge médical
        const contentDiv = document.createElement('div');
        contentDiv.className = 'member-content';
        
        // Créer le badge de statut médical
        const medicalBadge = document.createElement('span');
        medicalBadge.className = `medical-status ${member.medicalStatus.toLowerCase().replace(' ', '-')}`;
        medicalBadge.textContent = member.medicalStatus;
        
        contentDiv.innerHTML = `
            <h3>${member.prenom} ${member.nom}</h3>
        `;
        contentDiv.appendChild(medicalBadge);
        
        // Créer le bouton d'ajout
        const addButton = document.createElement('button');
        addButton.className = 'add-participant';
        addButton.innerHTML = '<i class="fas fa-plus"></i>';
        
        // Désactiver le bouton pour les membres non éligibles
        if (member.medicalStatus === 'PAS OK') {
            addButton.disabled = true;
            addButton.title = 'Ce membre ne peut pas participer : certificat médical expiré';
            addButton.style.cursor = 'not-allowed';
            addButton.style.opacity = '0.5';
        } else {
            addButton.onclick = () => addParticipant(member);
            if (member.medicalStatus === 'INCONNU') {
                addButton.title = 'Attention : statut médical inconnu';
            }
        }
        
        // Assembler la carte
        memberCard.appendChild(avatarDiv);
        memberCard.appendChild(contentDiv);
        memberCard.appendChild(addButton);
        
        membersList.appendChild(memberCard);
        cardsCreated++;
        
        } catch (cardError) {
            console.error(`❌ [DISPLAY DEBUG] Error creating member card ${index + 1}:`, cardError);
            console.error('❌ [DISPLAY DEBUG] Member data:', member);
            throw cardError;
        }
    });
    
    console.log(`✅ [DISPLAY DEBUG] Successfully created ${cardsCreated} member cards`);
} 