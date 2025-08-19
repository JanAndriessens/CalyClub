// DOM Elements
const avatarsContainer = document.getElementById('avatarsContainer');
const searchInput = document.getElementById('searchInput');
const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
const avatarFileInput = document.getElementById('avatarFileInput');

// Vérifier si les éléments DOM existent
if (!avatarsContainer || !searchInput || !uploadAvatarBtn || !avatarFileInput) {
    console.error('Erreur: Éléments DOM non trouvés');
}

// Gérer l'upload d'avatar
uploadAvatarBtn.onclick = () => {
    console.log('Upload button clicked');
    avatarFileInput.click();
};

avatarFileInput.onchange = async (e) => {
    console.log('File selected');
    const file = e.target.files[0];
    if (!file) return;

    const lifrasID = prompt('Entrez le LifrasID du membre :');
    if (!lifrasID) {
        alert('LifrasID requis');
        return;
    }

    try {
        // Compresser l'image
        const compressedFile = await compressImage(file);
        console.log('Image compressée');
        
        // Upload de l'image vers Firebase Storage
        const storageRef = window.storage.ref();
        const avatarRef = storageRef.child(`avatars/${lifrasID}_${Date.now()}`);
        console.log('Upload vers Firebase Storage...');
        const uploadTask = await avatarRef.put(compressedFile);
        const photoURL = await uploadTask.ref.getDownloadURL();
        console.log('URL de la photo:', photoURL);

        // Vérifier si un avatar existe déjà pour ce LifrasID
        const existingAvatar = await window.db
            .collection('avatars')
            .where('lifrasID', '==', lifrasID)
            .get();

        if (!existingAvatar.empty) {
            // Mettre à jour l'avatar existant
            await existingAvatar.docs[0].ref.update({
                photoURL: photoURL,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert('Avatar mis à jour avec succès !');
        } else {
            // Créer un nouvel avatar
            await window.db.collection('avatars').add({
                lifrasID: lifrasID,
                photoURL: photoURL,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'active'
            });
            alert('Avatar ajouté avec succès !');
        }

        // Réinitialiser l'input file
        avatarFileInput.value = '';
    } catch (error) {
        console.error('Erreur lors de l\'upload:', error);
        alert('Erreur lors de l\'upload: ' + error.message);
    }
};

// Fonction pour compresser l'image
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

// Charger les avatars
function loadAvatars() {
    return window.db
        .collection('avatars')
        .orderBy('lifrasID')
        .onSnapshot((snapshot) => {
            displayAvatars(snapshot.docs);
        }, (error) => {
            console.error('Erreur lors du chargement des avatars:', error);
            alert('Erreur lors du chargement des avatars: ' + error.message);
        });
}

// Afficher les avatars
function displayAvatars(avatars) {
    if (!avatarsContainer) return;

    avatarsContainer.innerHTML = '';

    if (avatars.length === 0) {
        avatarsContainer.innerHTML = '<div class="text-center">Aucun avatar trouvé</div>';
        return;
    }

    avatars.forEach(doc => {
        const avatar = doc.data();
        const card = document.createElement('div');
        card.className = 'avatar-card';
        
        const img = document.createElement('img');
        img.className = 'avatar-image';
        img.alt = `Avatar de ${avatar.lifrasID}`;
        
        // Utiliser le système robuste d'avatar si disponible
        if (window.AvatarUtils) {
            window.AvatarUtils.setupRobustAvatar(img, avatar.photoURL, avatar.lifrasID, {
                showLoading: true,
                loadingClass: 'loading',
                onSuccess: (finalUrl) => {
                    console.log(`✅ Avatar management page loaded avatar: ${finalUrl}`);
                },
                onFallback: () => {
                    console.log(`🔄 Avatar management fallback for ${avatar.lifrasID}`);
                }
            });
        } else {
            // Fallback basique
            img.src = avatar.photoURL || '/avatars/default-avatar.svg';
            img.onerror = () => {
                img.src = '/avatars/default-avatar.svg';
            };
        }

        const info = document.createElement('div');
        info.className = 'avatar-info';
        
        const fields = [
            { label: 'LifrasID', value: avatar.lifrasID || '-' },
            { label: 'Photo URL', value: avatar.photoURL || '-' },
            { label: 'Date de création', value: avatar.createdAt ? new Date(avatar.createdAt.toDate()).toLocaleDateString() : '-' },
            { label: 'Dernière mise à jour', value: avatar.updatedAt ? new Date(avatar.updatedAt.toDate()).toLocaleDateString() : '-' },
            { label: 'Statut', value: avatar.status || '-' }
        ];

        fields.forEach(field => {
            const row = document.createElement('div');
            row.className = 'info-row';
            row.innerHTML = `
                <span class="label">${field.label}:</span>
                <span class="value truncate">${field.value}</span>
            `;
            info.appendChild(row);
        });

        const actions = document.createElement('div');
        actions.className = 'avatar-actions';
        actions.innerHTML = `
            <button class="action-button delete" onclick="deleteAvatar('${doc.id}')">
                <i class="fas fa-trash"></i> Supprimer
            </button>
        `;

        card.appendChild(img);
        card.appendChild(info);
        card.appendChild(actions);
        avatarsContainer.appendChild(card);
    });
}

// Supprimer un avatar
async function deleteAvatar(avatarId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet avatar ?')) {
        return;
    }

    try {
        const doc = await window.db.collection('avatars').doc(avatarId).get();
        if (!doc.exists) {
            throw new Error('Avatar non trouvé');
        }

        const avatar = doc.data();
        
        // Supprimer l'image du Storage
        if (avatar.photoURL) {
            const photoRef = window.storage.refFromURL(avatar.photoURL);
            await photoRef.delete();
        }

        // Supprimer le document de Firestore
        await window.db.collection('avatars').doc(avatarId).delete();

        alert('Avatar supprimé avec succès !');
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression: ' + error.message);
    }
}

// Initialiser la page
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier l'authentification
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log('Utilisateur connecté, chargement des avatars...');
            loadAvatars();
        } else {
            console.log('Utilisateur non connecté, redirection vers la page de connexion...');
            window.location.href = '/login.html';
        }
    });
}); 