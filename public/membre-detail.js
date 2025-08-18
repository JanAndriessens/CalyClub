// Variables globales
let memberAvatar;
let avatarFileInput;
let currentMembreId;
let isInitialized = false;

// Initialisation des éléments DOM
function initializeDOM() {
    console.log('Initialisation du DOM...');
    memberAvatar = document.getElementById('memberAvatar');
    avatarFileInput = document.getElementById('avatarUpload');
    const uploadButton = document.querySelector('.upload-button');
    const removeButton = document.getElementById('removeAvatarButton');

    console.log('DOM Elements initialized:', {
        memberAvatar: !!memberAvatar,
        avatarFileInput: !!avatarFileInput,
        uploadButton: !!uploadButton,
        removeButton: !!removeButton
    });

    if (!memberAvatar || !avatarFileInput || !uploadButton || !removeButton) {
        console.error('Erreur: Éléments DOM non trouvés');
        return false;
    }
    console.log('DOM initialisé avec succès');
    return true;
}

// Initialisation de Firebase
// Firebase wordt nu geïnitialiseerd door firebase-app.js

// Variable pour suivre l'état de la persistance
let persistenceEnabled = false;
let isOnline = navigator.onLine;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000; // 5 secondes

// Variable pour suivre l'état de la connexion
let isFirestoreConnected = false;
let lastConnectionAttempt = 0;
const CONNECTION_TIMEOUT = 3000; // FIXED: 3 seconds instead of 30 seconds

// Cache pour les avatars avec gestion de la taille
const avatarCache = new Map();
const MAX_CACHE_SIZE = 50; // Nombre maximum d'avatars en cache

// Fonction pour gérer le cache des avatars
function manageAvatarCache(lifrasID, url) {
    if (avatarCache.size >= MAX_CACHE_SIZE) {
        // Supprimer le plus ancien élément si le cache est plein
        const firstKey = avatarCache.keys().next().value;
        avatarCache.delete(firstKey);
    }
    avatarCache.set(lifrasID, url);
}

// Fonction pour précharger les images
function preloadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

// Fonction pour vérifier la connexion réseau avec retry
async function checkNetworkConnection(retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            if (!navigator.onLine) {
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            const user = firebase.auth().currentUser;
            if (!user) {
                throw new Error('Utilisateur non authentifié');
            }

            const token = await user.getIdToken(true);
            if (!token) {
                throw new Error('Impossible de récupérer le token');
            }

            const testDoc = await db.collection('_health').doc('check').get({
                source: 'server',
                cache: 'no-cache'
            });

            if (!testDoc.exists) {
                throw new Error('Firestore health check failed');
            }

            return true;
        } catch (error) {
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    return false;
}

// Fonction pour vérifier la connexion Firestore
async function checkFirestoreConnection() {
    try {
        const now = Date.now();
        if (now - lastConnectionAttempt < 1000) {
            return isFirestoreConnected;
        }
        lastConnectionAttempt = now;

        if (!navigator.onLine) {
            return false;
        }

        const user = firebase.auth().currentUser;
        if (!user) {
            return false;
        }

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), CONNECTION_TIMEOUT);
        });

        const testPromise = db.collection('_health').doc('check').get({
            source: 'server',
            cache: 'no-cache'
        });

        const testDoc = await Promise.race([testPromise, timeoutPromise]);
        
        isFirestoreConnected = true;
        return true;
    } catch (error) {
        isFirestoreConnected = false;
        return false;
    }
}

// Fonction pour réinitialiser la connexion Firestore
async function resetFirestoreConnection() {
    try {
        const isNetworkConnected = await checkNetworkConnection();
        if (!isNetworkConnected) {
            throw new Error('Pas de connexion réseau');
        }
        
        const isConnected = await checkFirestoreConnection();
        if (isConnected) {
            return true;
        } else {
            throw new Error('La réinitialisation n\'a pas rétabli la connexion');
        }
    } catch (error) {
        return false;
    }
}

// Activer la persistance hors ligne
async function enablePersistence() {
    try {
        const isNetworkConnected = await checkNetworkConnection();
        if (!isNetworkConnected) {
            throw new Error('Pas de connexion réseau');
        }

        const isConnected = await checkFirestoreConnection();
        if (!isConnected) {
            const resetSuccess = await resetFirestoreConnection();
            if (!resetSuccess) {
                throw new Error('Impossible de rétablir la connexion Firestore');
            }
        }

        await db.enablePersistence({ 
            synchronizeTabs: true,
            forceOwningTab: true
        });
        persistenceEnabled = true;
    } catch (err) {
        if (err.code === 'failed-precondition') {
            try {
                await resetFirestoreConnection();
                persistenceEnabled = true;
            } catch (networkErr) {
                console.error('Erreur lors de la réinitialisation réseau:', networkErr);
            }
        }
    }
}

// Fonction pour initialiser le document de test _health
async function initializeHealthCheck() {
    try {
        const healthRef = db.collection('_health').doc('check');
        const healthDoc = await healthRef.get();
        
        if (!healthDoc.exists) {
            await healthRef.set({
                status: 'ok',
                lastChecked: firebase.firestore.FieldValue.serverTimestamp(),
                environment: 'production'
            });
        }
    } catch (error) {
        console.error('Erreur lors de l\'initialisation du document _health:', error);
    }
}

// Fonction pour initialiser l'application
async function initializeApp() {
    if (isInitialized) return;
    
    try {
        if (!initializeDOM()) {
            throw new Error('Erreur lors de l\'initialisation du DOM');
        }
        
        // ⚡ MOBILE OPTIMIZED: Use centralized device detection
        const isMobileDevice = window.DeviceUtils?.isMobileDevice || false;
        const checkInterval = window.DeviceUtils?.checkInterval || 100;
        const maxAttempts = window.DeviceUtils?.maxAttempts || 30;
        
        if (isMobileDevice) {
            console.log('📱 Membre Detail: Mobile device detected - using optimized intervals');
        }

        const firebaseReady = new Promise((resolve) => {
            let attempts = 0;
            const checkFirebase = setInterval(() => {
                attempts++;
                if (window.db && window.firebase && firebase.apps.length > 0) {
                    clearInterval(checkFirebase);
                    console.log('✅ Membre Detail: Firebase ready');
                    resolve(true);
                } else if (attempts > maxAttempts) {
                    clearInterval(checkFirebase);
                    console.warn(`⚠️ Membre Detail: Firebase timeout (${isMobileDevice ? '5s mobile' : '3s desktop'})`);
                    resolve(false);
                }
            }, checkInterval);
        });
        
        await firebaseReady;
        
        // ⚡ Setup UI immediately
        setupEventListeners();
        
        // ⚡ Run heavy operations in parallel (non-blocking)
        Promise.all([
            enablePersistence().catch(error => console.warn('Persistence failed:', error)),
            initializeHealthCheck().catch(error => console.warn('Health check failed:', error)),
            initializeMemberDetailPermissions().catch(error => console.warn('Permissions failed:', error))
        ]).catch(error => console.warn('Background initialization failed:', error));
        
        isInitialized = true;
        console.log('Application initialisée avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'application:', error);
    }
}

// Configurer les écouteurs d'événements
function setupEventListeners() {
    console.log('Configuration des écouteurs d\'événements...');

    // Navigation buttons
    document.querySelectorAll('[data-href]').forEach(button => {
        button.addEventListener('click', function() {
            const href = this.getAttribute('data-href');
            window.location.href = href;
        });
    });

    // Edit buttons
    document.querySelectorAll('.edit-button').forEach(button => {
        button.addEventListener('click', function() {
            const field = this.getAttribute('data-field');
            toggleEdit(field);
        });
    });

    // Save buttons
    document.querySelectorAll('.save-button').forEach(button => {
        button.addEventListener('click', function() {
            const field = this.getAttribute('data-field');
            saveField(field);
        });
    });

    // Avatar upload
    const avatarUpload = document.getElementById('avatarUpload');
    const uploadButton = document.querySelector('.upload-button');
    const removeAvatarButton = document.getElementById('removeAvatarButton');

    if (uploadButton && avatarUpload) {
        uploadButton.addEventListener('click', () => {
            avatarUpload.click();
        });
    }

    if (avatarUpload) {
        avatarUpload.addEventListener('change', handleAvatarUpload);
    }

    if (removeAvatarButton) {
        removeAvatarButton.addEventListener('click', handleRemoveAvatar);
    }
}

// Fonction pour charger les détails du membre
async function loadMembreDetails() {
    console.log('=== DÉBUT DU CHARGEMENT DES DÉTAILS ===');
    try {
        // Vérifier si Firebase est initialisé
        if (!firebase.apps.length) {
            throw new Error('Firebase n\'est pas initialisé');
        }

        // Vérifier si Firestore est initialisé
        if (!window.db) {
            throw new Error('Firestore n\'est pas initialisé');
        }

        // Récupérer l'ID du membre depuis l'URL
        const urlParams = new URLSearchParams(window.location.search);
        currentMembreId = urlParams.get('id');
        
        console.log('URL complète:', window.location.href);
        console.log('ID du membre:', currentMembreId);
        
        if (!currentMembreId) {
            throw new Error('ID du membre non spécifié dans l\'URL');
        }

        // Récupérer le document du membre
        console.log('Tentative de récupération du document...');
        const docRef = window.db.collection('membres').doc(currentMembreId);
        
        // Attendre la récupération du document
        const doc = await docRef.get();
        console.log('Document récupéré:', doc.exists ? 'existe' : 'n\'existe pas');

        if (!doc.exists) {
            throw new Error(`Aucun membre trouvé avec l'ID: ${currentMembreId}`);
        }

        // Récupérer les données
        const membre = doc.data();
        console.log('Données brutes du membre:', membre);

        if (!membre) {
            throw new Error('Les données du membre sont vides');
        }

        // Vérifier les champs requis
        const requiredFields = ['lifrasID', 'nom', 'prenom'];
        const missingFields = requiredFields.filter(field => !membre[field]);
        if (missingFields.length > 0) {
            console.warn('Champs manquants:', missingFields);
        }

        // Afficher les détails
        console.log('Affichage des détails...');
        displayMembreDetails(membre);

        // Charger l'avatar
        if (membre.lifrasID) {
            console.log('Chargement de l\'avatar...');
            await loadMemberAvatar(membre.lifrasID);
        }

        console.log('=== CHARGEMENT TERMINÉ AVEC SUCCÈS ===');
    } catch (error) {
        console.error('=== ERREUR LORS DU CHARGEMENT ===');
        console.error('Message d\'erreur:', error.message);
        console.error('Stack trace:', error.stack);
        alert('Erreur lors du chargement des détails: ' + error.message);
    }
}

// Fonction pour charger l'avatar du membre avec système robuste
async function loadMemberAvatar(lifrasID) {
    try {
        console.log('🖼️ Loading avatar for LifrasID:', lifrasID);
        
        // Utiliser le nouveau système robuste d'avatar
        if (window.AvatarUtils) {
            // Essayer de récupérer l'URL depuis Firebase d'abord
            let primaryUrl = null;
            let avatarData = null;
            
            try {
                if (window.db) {
                    const avatarQuery = await window.db.collection('avatars')
                        .where('lifrasID', '==', lifrasID)
                        .limit(1)
                        .get();
                    
                    if (!avatarQuery.empty) {
                        avatarData = avatarQuery.docs[0].data();
                        primaryUrl = avatarData.photoURL;
                        console.log('📄 Avatar document found:', !!avatarData);
                    } else {
                        console.log('📄 No avatar document found in Firebase');
                    }
                }
            } catch (dbError) {
                console.warn('⚠️ Firebase avatar query failed:', dbError.message);
            }
            
            // Configurer l'avatar avec le système robuste
            window.AvatarUtils.setupRobustAvatar(memberAvatar, primaryUrl, lifrasID, {
                showLoading: true,
                loadingClass: 'loading',
                onSuccess: (finalUrl) => {
                    console.log('✅ Avatar loaded successfully:', finalUrl);
                    manageAvatarCache(lifrasID, finalUrl);
                },
                onFallback: () => {
                    console.log('🔄 Avatar fallback activated for lifrasID:', lifrasID);
                }
            });
            
            // Mettre à jour les champs d'information si on a des données Firebase
            updateAvatarInfoFields(avatarData);
            
        } else {
            // Fallback si AvatarUtils n'est pas disponible
            console.warn('⚠️ AvatarUtils not available, using basic fallback');
            memberAvatar.src = '/avatars/default-avatar.svg';
            updateAvatarInfoFields(null);
        }
        
    } catch (error) {
        console.error('❌ Error in loadMemberAvatar:', error);
        // Fallback final
        memberAvatar.src = '/avatars/default-avatar.svg';
        memberAvatar.classList.remove('loading');
        updateAvatarInfoFields(null);
    }
}

// Helper function pour mettre à jour les champs d'information
function updateAvatarInfoFields(avatarData) {
    const avatarLifrasID = document.getElementById('avatarLifrasID');
    const avatarPhotoURL = document.getElementById('avatarPhotoURL');
    const avatarCreatedAt = document.getElementById('avatarCreatedAt');
    const avatarStatus = document.getElementById('avatarStatus');

    if (avatarData) {
        if (avatarLifrasID) avatarLifrasID.textContent = `LifrasID: ${avatarData.lifrasID || '-'}`;
        if (avatarPhotoURL) avatarPhotoURL.textContent = `Photo URL: ${avatarData.photoURL || '-'}`;
        if (avatarCreatedAt) avatarCreatedAt.textContent = `Créé le: ${avatarData.createdAt ? new Date(avatarData.createdAt.toDate()).toLocaleDateString() : '-'}`;
        if (avatarStatus) avatarStatus.textContent = `Statut: ${avatarData.status || '-'}`;
    } else {
        if (avatarLifrasID) avatarLifrasID.textContent = 'LifrasID: -';
        if (avatarPhotoURL) avatarPhotoURL.textContent = 'Photo URL: -';
        if (avatarCreatedAt) avatarCreatedAt.textContent = 'Créé le: -';
        if (avatarStatus) avatarStatus.textContent = 'Statut: -';
    }
}

// Fonction pour afficher les détails du membre
function displayMembreDetails(membre) {
    console.log('=== DÉBUT DE L\'AFFICHAGE DES DÉTAILS ===');
    try {
        const setTextContent = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value || '-';
            }
        };

        // Mettre à jour le titre
        const memberTitle = document.getElementById('memberTitle');
        if (memberTitle) {
            const fullName = `${membre.prenom || ''} ${membre.nom || ''}`.trim() || 'Membre sans nom';
            memberTitle.textContent = fullName;
            console.log('[Titre] =', fullName);
        } else {
            console.warn('[ERREUR] Element title non trouvé');
        }

        // Informations de base
        console.log('Affichage des informations de base...');
        setTextContent('lifrasID', membre.lifrasID);
        setTextContent('nom', membre.nom);
        setTextContent('prenom', membre.prenom);
        setTextContent('dateNaissance', formatDate(membre.dateNaissance));
        setTextContent('nationalite', membre.nationalite);

        // Coordonnées
        console.log('Affichage des coordonnées...');
        setTextContent('adresse', membre.adresse);
        setTextContent('codePostal', membre.codePostal);
        setTextContent('localite', membre.localite);
        setTextContent('pays', membre.pays);
        setTextContent('email1', membre.email1);
        setTextContent('email2', membre.email2);
        setTextContent('email3', membre.email3);

        // Téléphones
        console.log('Affichage des téléphones...');
        setTextContent('telephonePrive', membre.telephonePrive);
        setTextContent('telephoneBureau', membre.telephoneBureau);
        setTextContent('gsm1', membre.gsm1);
        setTextContent('gsm2', membre.gsm2);
        setTextContent('gsm3', membre.gsm3);
        setTextContent('ice', membre.ice);

        // Certifications
        console.log('Affichage des certifications...');
        // Calculer le statut médical en temps réel basé sur la validité du certificat
        const medicalStatus = window.calculateMedicalStatus ? 
            window.calculateMedicalStatus(membre.validiteCertificatMedical) : 
            (membre.medical || 'INCONNU');
        
        // Mettre à jour le statut médical avec les classes CSS appropriées
        const medicalElement = document.getElementById('medical');
        if (medicalElement) {
            medicalElement.textContent = medicalStatus;
            // Supprimer les anciennes classes
            medicalElement.classList.remove('ok', 'pas-ok', 'inconnu');
            // Ajouter la classe appropriée basée sur le statut
            if (medicalStatus === 'OK') {
                medicalElement.classList.add('ok');
            } else if (medicalStatus === 'PAS OK') {
                medicalElement.classList.add('pas-ok');
            } else {
                medicalElement.classList.add('inconnu');
            }
        }
        setTextContent('dateCertificatMedical', formatDate(membre.dateCertificatMedical));
        setTextContent('validiteCertificatMedical', formatDate(membre.validiteCertificatMedical));
        setTextContent('dateECG', formatDate(membre.dateECG));
        setTextContent('validiteECG', formatDate(membre.validiteECG));
        setTextContent('typeCertif1', membre.typeCertif1);
        setTextContent('typeCertif2', membre.typeCertif2);

        // Qualifications
        console.log('Affichage des qualifications...');
        setTextContent('plongeur', formatBoolean(membre.plongeur));
        setTextContent('apneiste', formatBoolean(membre.apneiste));
        setTextContent('gasBlender', formatBoolean(membre.gasBlender));
        setTextContent('nitrox', formatBoolean(membre.nitrox));
        setTextContent('plongeeSouterraine', formatBoolean(membre.plongeeSouterraine));
        setTextContent('plongeurAdapte', formatBoolean(membre.plongeurAdapte));
        setTextContent('qualificationPPA', formatBoolean(membre.qualificationPPA));
        setTextContent('qualificationVE', formatBoolean(membre.qualificationVE));
        setTextContent('techniqueSubaquatique', formatBoolean(membre.techniqueSubaquatique));
        setTextContent('trimix', formatBoolean(membre.trimix));

        // Autres informations
        console.log('Affichage des autres informations...');
        setTextContent('dateDerniereInscription', formatDate(membre.dateDerniereInscription));
        setTextContent('validiteCFPS', formatDate(membre.validiteCFPS));
        setTextContent('adeps', membre.adeps);
        setTextContent('plongeeEnfantEncadrant', formatBoolean(membre.plongeeEnfantEncadrant));
        setTextContent('photographe', formatBoolean(membre.photographe));
        setTextContent('archeologue', formatBoolean(membre.archeologue));
        setTextContent('medecin', formatBoolean(membre.medecin));
        setTextContent('newsletter', formatBoolean(membre.newsletter));
        setTextContent('licenceFD', membre.licenceFD);
        setTextContent('description', membre.description);

        console.log('=== AFFICHAGE TERMINÉ AVEC SUCCÈS ===');
    } catch (error) {
        console.error('=== ERREUR LORS DE L\'AFFICHAGE ===');
        console.error('Message d\'erreur:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Fonction pour formater les valeurs booléennes
function formatBoolean(value) {
    return value ? 'Oui' : 'Non';
}

// Fonction pour formater les dates
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) ? date.toLocaleDateString('fr-BE') : '-';
}

// Functie om afbeelding te comprimeren
async function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400;
                const MAX_HEIGHT = 400;
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(compressedFile);
                }, 'image/jpeg', 0.8);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

// Function to toggle edit mode for a field
function toggleEdit(fieldId) {
    const span = document.getElementById(fieldId);
    const input = document.getElementById(fieldId + 'Input');
    const editButton = span.parentElement.querySelector('.edit-button');
    const saveButton = span.parentElement.querySelector('.save-button');

    if (span.style.display !== 'none') {
        // Switch to edit mode
        span.style.display = 'none';
        input.style.display = 'inline-block';
        input.value = span.textContent;
        editButton.style.display = 'none';
        saveButton.style.display = 'inline-block';
        input.focus();
    } else {
        // Switch back to view mode
        span.style.display = 'inline-block';
        input.style.display = 'none';
        editButton.style.display = 'inline-block';
        saveButton.style.display = 'none';
    }
}

// Function to save field changes
async function saveField(fieldId) {
    try {
        const input = document.getElementById(fieldId + 'Input');
        const span = document.getElementById(fieldId);
        const editButton = span.parentElement.querySelector('.edit-button');
        const saveButton = span.parentElement.querySelector('.save-button');
        const newValue = input.value.trim();

        // Update in Firestore
        await window.db.collection('membres').doc(currentMembreId).update({
            [fieldId]: newValue,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update UI
        span.textContent = newValue || '-';
        span.style.display = 'inline-block';
        input.style.display = 'none';
        editButton.style.display = 'inline-block';
        saveButton.style.display = 'none';

        alert('Champ mis à jour avec succès !');
    } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        alert('Erreur lors de la mise à jour: ' + error.message);
    }
}

// Function to handle avatar upload
async function handleAvatarUpload(e) {
    console.log('File selected');
    const file = e.target.files[0];
    if (!file) {
        console.log('No file selected');
        return;
    }

    try {
        const memberId = new URLSearchParams(window.location.search).get('id');
        if (!memberId) {
            throw new Error('ID du membre non trouvé');
        }

        // Récupérer le LifrasID du membre
        const memberDoc = await window.db.collection('membres').doc(memberId).get();
        const memberData = memberDoc.data();
        
        if (!memberData || !memberData.lifrasID) {
            throw new Error('LifrasID non trouvé');
        }

        // Compresser l'image
        const compressedFile = await compressImage(file);
        
        // Upload de l'image vers Firebase Storage
        const storageRef = window.storage.ref();
        const avatarRef = storageRef.child(`avatars/${memberData.lifrasID}_${Date.now()}`);
        const uploadTask = await avatarRef.put(compressedFile);
        const photoURL = await uploadTask.ref.getDownloadURL();

        // Vérifier si un avatar existe déjà pour ce LifrasID
        const avatarQuery = await window.db.collection('avatars')
            .where('lifrasID', '==', memberData.lifrasID)
            .limit(1)
            .get();

        if (!avatarQuery.empty) {
            // Mettre à jour l'avatar existant
            const avatarDoc = avatarQuery.docs[0];
            await avatarDoc.ref.update({
                photoURL: photoURL,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Créer un nouvel avatar
            await window.db.collection('avatars').add({
                lifrasID: memberData.lifrasID,
                photoURL: photoURL,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'active'
            });
        }

        // Mettre à jour le document du membre
        await window.db.collection('membres').doc(memberId).update({
            photoURL: photoURL,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Mettre à jour l'affichage
        memberAvatar.src = photoURL;
        
        alert('Photo de profil mise à jour avec succès !');
        
        // Réinitialiser l'input file
        e.target.value = '';
    } catch (error) {
        console.error('Erreur lors de l\'upload:', error);
        alert('Erreur lors de l\'upload: ' + error.message);
    }
}

// Function to handle avatar removal
async function handleRemoveAvatar() {
    console.log('Delete button clicked');
    if (!confirm('Êtes-vous sûr de vouloir supprimer la photo ?')) {
        console.log('Delete cancelled by user');
        return;
    }

    try {
        const memberId = new URLSearchParams(window.location.search).get('id');
        if (!memberId) {
            throw new Error('ID du membre non trouvé');
        }

        const memberDoc = await window.db.collection('membres').doc(memberId).get();
        const memberData = memberDoc.data();
        
        if (!memberData || !memberData.photoURL) {
            throw new Error('Aucune photo trouvée');
        }

        // Supprimer l'image du Storage
        const photoRef = window.storage.refFromURL(memberData.photoURL);
        await photoRef.delete();

        // Mettre à jour le document du membre
        await window.db.collection('membres').doc(memberId).update({
            photoURL: null,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Mettre à jour l'affichage
        memberAvatar.src = '/avatars/default-avatar.svg';
        
        alert('Photo supprimée avec succès !');
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression: ' + error.message);
    }
}

// Initialize member detail permissions and apply them to UI
async function initializeMemberDetailPermissions() {
    try {
        console.log('🔒 Initializing member detail permissions...');
        
        // Wait for member permissions to be ready
        if (!window.memberPermissions) {
            console.warn('⚠️ Member permissions not available');
            return;
        }

        // Initialize permissions
        await window.memberPermissions.initialize();
        
        // Apply permissions to UI elements
        await applyMemberDetailPermissions();
        
        console.log('✅ Member detail permissions initialized and applied');
        
    } catch (error) {
        console.error('❌ Failed to initialize member detail permissions:', error);
        // Disable functionality if permissions fail
        disableMemberDetailActions();
    }
}

// Apply permission checks to member detail UI elements
async function applyMemberDetailPermissions() {
    try {
        // Check permissions
        const canView = await canViewMemberDetails();
        const canModify = await canModifyMembers();
        const canManageAvatars = await canManageMemberAvatars();
        
        console.log('📋 Member detail permissions:', {
            canView,
            canModify,
            canManageAvatars
        });

        // If user can't view details, redirect them
        if (!canView) {
            console.log('🚫 User cannot view member details - redirecting');
            alert('Vous n\'avez pas les permissions pour voir les détails des membres.');
            window.location.href = '/membres.html';
            return;
        }

        // Apply permission checks to edit buttons
        const editButtons = document.querySelectorAll('.edit-button');
        const saveButtons = document.querySelectorAll('.save-button');
        
        if (!canModify) {
            editButtons.forEach(button => {
                button.style.display = 'none';
                button.disabled = true;
            });
            saveButtons.forEach(button => {
                button.style.display = 'none';
                button.disabled = true;
            });
            console.log('🚫 Edit buttons hidden - no modify permission');
        }

        // Apply permission checks to avatar management
        const uploadButton = document.querySelector('.upload-button');
        const removeButton = document.getElementById('removeAvatarButton');
        const avatarUpload = document.getElementById('avatarUpload');

        if (!canManageAvatars) {
            if (uploadButton) {
                uploadButton.style.display = 'none';
                uploadButton.disabled = true;
            }
            if (removeButton) {
                removeButton.style.display = 'none';
                removeButton.disabled = true;
            }
            if (avatarUpload) {
                avatarUpload.disabled = true;
            }
            console.log('🚫 Avatar management hidden - no avatar permission');
        }

        // Store permissions for later use
        window.memberDetailPermissions = {
            canView,
            canModify,
            canManageAvatars
        };

    } catch (error) {
        console.error('❌ Error applying member detail permissions:', error);
        disableMemberDetailActions();
    }
}

// Disable all member detail actions
function disableMemberDetailActions() {
    console.log('🚫 Disabling all member detail actions');
    
    // Disable edit functionality
    const editButtons = document.querySelectorAll('.edit-button');
    const saveButtons = document.querySelectorAll('.save-button');
    
    editButtons.forEach(button => {
        button.style.display = 'none';
        button.disabled = true;
    });
    
    saveButtons.forEach(button => {
        button.style.display = 'none';
        button.disabled = true;
    });

    // Disable avatar management
    const uploadButton = document.querySelector('.upload-button');
    const removeButton = document.getElementById('removeAvatarButton');
    const avatarUpload = document.getElementById('avatarUpload');

    if (uploadButton) {
        uploadButton.style.display = 'none';
        uploadButton.disabled = true;
    }
    if (removeButton) {
        removeButton.style.display = 'none';
        removeButton.disabled = true;
    }
    if (avatarUpload) {
        avatarUpload.disabled = true;
    }
}

// Enhanced toggle edit function with permission check
const originalToggleEdit = toggleEdit;
toggleEdit = async function(fieldId) {
    try {
        const canModify = await canModifyMembers();
        if (!canModify) {
            alert('Vous n\'avez pas les permissions pour modifier les informations des membres.');
            return;
        }
        originalToggleEdit(fieldId);
    } catch (error) {
        console.error('Error checking modify permission:', error);
        alert('Erreur lors de la vérification des permissions.');
    }
};

// Enhanced save field function with permission check
const originalSaveField = saveField;
saveField = async function(fieldId) {
    try {
        const canModify = await canModifyMembers();
        if (!canModify) {
            alert('Vous n\'avez pas les permissions pour modifier les informations des membres.');
            return;
        }
        await originalSaveField(fieldId);
    } catch (error) {
        console.error('Error during save field:', error);
        alert('Erreur lors de la sauvegarde: ' + error.message);
    }
};

// Enhanced avatar upload function with permission check
const originalHandleAvatarUpload = handleAvatarUpload;
handleAvatarUpload = async function(e) {
    try {
        const canManageAvatars = await canManageMemberAvatars();
        if (!canManageAvatars) {
            alert('Vous n\'avez pas les permissions pour gérer les avatars des membres.');
            return;
        }
        await originalHandleAvatarUpload(e);
    } catch (error) {
        console.error('Error during avatar upload:', error);
        alert('Erreur lors de l\'upload: ' + error.message);
    }
};

// Enhanced avatar removal function with permission check
const originalHandleRemoveAvatar = handleRemoveAvatar;
handleRemoveAvatar = async function() {
    try {
        const canManageAvatars = await canManageMemberAvatars();
        if (!canManageAvatars) {
            alert('Vous n\'avez pas les permissions pour gérer les avatars des membres.');
            return;
        }
        await originalHandleRemoveAvatar();
    } catch (error) {
        console.error('Error during avatar removal:', error);
        alert('Erreur lors de la suppression: ' + error.message);
    }
};

// Initialiser la page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded');
    try {
        if (!initializeDOM()) throw new Error('Échec de l\'initialisation du DOM');
        setupEventListeners();
        
        // Wait for Firebase to be initialized - MOBILE OPTIMIZED
        const isMobileDevice = window.DeviceUtils?.isMobileDevice || false;
        const checkInterval = window.DeviceUtils?.checkInterval || 100;
        
        if (isMobileDevice) {
            console.log('📱 Membre Detail DOM: Mobile device detected - using optimized Firebase check');
        }

        await new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 40; // Maximum wait time
            
            const checkFirebase = setInterval(() => {
                attempts++;
                if (window.db && window.firebase && firebase.apps.length > 0) {
                    clearInterval(checkFirebase);
                    console.log('✅ Membre Detail DOM: Firebase ready for member details');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkFirebase);
                    console.warn('⚠️ Membre Detail DOM: Firebase timeout - proceeding anyway');
                    resolve(); // Resolve anyway to prevent hanging
                }
            }, checkInterval);
        });
        
        await loadMembreDetails();
        // ... avatar upload logic ...
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        alert('Erreur lors de l\'initialisation: ' + error.message);
    }
}); 