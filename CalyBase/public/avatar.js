// Fonction pour charger les avatars
async function loadAvatars() {
    try {
        const avatarsList = document.getElementById('avatarsList');
        avatarsList.innerHTML = '';

        const membersSnapshot = await firebase.firestore().collection('membres').get();
        const members = [];
        
        membersSnapshot.forEach(doc => {
            const memberData = doc.data();
            members.push({
                id: memberData.lifrasid,
                prenom: memberData.prenom || '',
                nom: memberData.nom || ''
            });
        });

        // Trier les membres par nom
        members.sort((a, b) => {
            const nomA = (a.nom || '').toLowerCase();
            const nomB = (b.nom || '').toLowerCase();
            return nomA.localeCompare(nomB, 'fr');
        });

        members.forEach(member => {
            const memberCard = createMemberCard(member);
            avatarsList.appendChild(memberCard);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des avatars:', error);
    }
}

// Fonction pour créer une carte de membre
function createMemberCard(member) {
    const card = document.createElement('div');
    card.className = 'member-card';
    card.dataset.memberId = member.id;

    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'avatar-container';

    const img = document.createElement('img');
    img.alt = `${member.prenom} ${member.nom}`;
    img.className = 'avatar-image';
    img.onerror = () => {
        const placeholder = document.createElement('div');
        placeholder.className = 'avatar-placeholder';
        placeholder.textContent = (member.prenom?.[0] || '') + (member.nom?.[0] || '');
        avatarContainer.innerHTML = '';
        avatarContainer.appendChild(placeholder);
    };

    // Charger l'avatar depuis la collection avatars
    firebase.firestore().collection('avatars')
        .where('lifrasID', '==', member.id)
        .limit(1)
        .get()
        .then(snapshot => {
            if (!snapshot.empty) {
                const avatarData = snapshot.docs[0].data();
                if (avatarData.photo) {
                    img.src = avatarData.photo;
                    avatarContainer.appendChild(img);
                } else {
                    throw new Error('Pas de photo trouvée');
                }
            } else {
                throw new Error('Pas d\'avatar trouvé');
            }
        })
        .catch(error => {
            console.error('Erreur lors du chargement de l\'avatar:', error);
            const placeholder = document.createElement('div');
            placeholder.className = 'avatar-placeholder';
            placeholder.textContent = (member.prenom?.[0] || '') + (member.nom?.[0] || '');
            avatarContainer.innerHTML = '';
            avatarContainer.appendChild(placeholder);
        });

    const uploadButton = document.createElement('button');
    uploadButton.className = 'upload-button';
    uploadButton.innerHTML = 'Changer';
    uploadButton.onclick = () => document.getElementById('avatarInput').click();

    const nameDisplay = document.createElement('div');
    nameDisplay.className = 'member-name';
    nameDisplay.textContent = `${member.prenom} ${member.nom}`;

    card.appendChild(avatarContainer);
    card.appendChild(uploadButton);
    card.appendChild(nameDisplay);

    return card;
}

// Fonction pour gérer le téléchargement d'un avatar
async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const memberCard = event.target.closest('.member-card');
    if (!memberCard) return;

    const memberId = memberCard.dataset.memberId;
    const avatarContainer = memberCard.querySelector('.avatar-container');

    try {
        // Redimensionner et compresser l'image
        const processedFile = await resizeAndCompressImage(file);
        
        // Créer une référence unique pour l'avatar
        const timestamp = Date.now();
        const storageRef = firebase.storage().ref();
        const avatarRef = storageRef.child(`avatars/${memberId}_${timestamp}.jpg`);

        // Upload de l'image avec metadata
        const metadata = {
            contentType: 'image/jpeg',
            customMetadata: {
                'lifrasID': memberId
            }
        };

        // Upload de l'image
        const uploadTask = await avatarRef.put(processedFile, metadata);
        const photoURL = await uploadTask.ref.getDownloadURL();

        // Mettre à jour l'interface utilisateur
        const img = document.createElement('img');
        img.src = photoURL;
        img.alt = 'Avatar';
        img.className = 'avatar-image';
        avatarContainer.innerHTML = '';
        avatarContainer.appendChild(img);

        // Sauvegarder dans Firestore
        const avatarQuery = await firebase.firestore().collection('avatars')
            .where('lifrasID', '==', memberId)
            .limit(1)
            .get();

        if (!avatarQuery.empty) {
            // Mettre à jour l'avatar existant
            const avatarDoc = avatarQuery.docs[0];
            await avatarDoc.ref.update({
                photo: photoURL,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Créer un nouvel avatar
            await firebase.firestore().collection('avatars').add({
                lifrasID: memberId,
                photo: photoURL,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        console.log('Avatar mis à jour avec succès');
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'avatar:', error);
        alert('Erreur lors de la mise à jour de l\'avatar');
    }
}

// Fonction pour supprimer un avatar
async function removeAvatar(memberId) {
    try {
        // Trouver l'avatar dans la collection avatars
        const avatarQuery = await firebase.firestore().collection('avatars')
            .where('lifrasID', '==', memberId)
            .limit(1)
            .get();

        if (!avatarQuery.empty) {
            const avatarDoc = avatarQuery.docs[0];
            const avatarData = avatarDoc.data();

            // Supprimer l'image du Storage si elle existe
            if (avatarData.photo) {
                const photoRef = firebase.storage().refFromURL(avatarData.photo);
                await photoRef.delete();
            }

            // Supprimer le document de l'avatar
            await avatarDoc.ref.delete();
        }

        // Mettre à jour l'interface utilisateur
        const memberCard = document.querySelector(`.member-card[data-member-id="${memberId}"]`);
        if (memberCard) {
            const avatarContainer = memberCard.querySelector('.avatar-container');
            const memberName = memberCard.querySelector('.member-name').textContent;
            const initials = memberName.split(' ').map(n => n[0]).join('');
            
            avatarContainer.innerHTML = '';
            const placeholder = document.createElement('div');
            placeholder.className = 'avatar-placeholder';
            placeholder.textContent = initials;
            avatarContainer.appendChild(placeholder);
        }

        console.log('Avatar supprimé avec succès');
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'avatar:', error);
        alert('Erreur lors de la suppression de l\'avatar');
    }
} 