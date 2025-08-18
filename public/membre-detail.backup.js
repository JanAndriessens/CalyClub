// Backup of working JavaScript code for avatar loading
// Created on: 2024-03-19

// Fonction pour charger l'avatar du membre avec optimisation
async function loadMemberAvatar(lifrasID) {
    try {
        console.log('Loading avatar for LifrasID:', lifrasID);
        
        // Vérifier d'abord le cache
        if (avatarCache.has(lifrasID)) {
            console.log('Avatar found in cache');
            memberAvatar.src = avatarCache.get(lifrasID);
            return;
        }

        // Afficher un indicateur de chargement
        memberAvatar.src = '/avatars/default-avatar.svg';
        memberAvatar.classList.add('loading');

        // Vérifier la collection avatars
        console.log('Checking avatars collection...');
        const avatarQuery = await window.db.collection('avatars')
            .where('lifrasID', '==', lifrasID)
            .limit(1)
            .get();

        if (!avatarQuery.empty) {
            console.log('Avatar document found');
            const avatarDoc = avatarQuery.docs[0];
            const avatarData = avatarDoc.data();
            
            if (avatarData.photoURL) {
                console.log('Setting avatar image:', avatarData.photoURL);
                memberAvatar.src = avatarData.photoURL;
                manageAvatarCache(lifrasID, avatarData.photoURL);

                // Mettre à jour les champs d'information
                const avatarLifrasID = document.getElementById('avatarLifrasID');
                const avatarPhotoURL = document.getElementById('avatarPhotoURL');
                const avatarCreatedAt = document.getElementById('avatarCreatedAt');
                const avatarStatus = document.getElementById('avatarStatus');

                if (avatarLifrasID) avatarLifrasID.textContent = `LifrasID: ${avatarData.lifrasID || '-'}`;
                if (avatarPhotoURL) avatarPhotoURL.textContent = `Photo URL: ${avatarData.photoURL || '-'}`;
                if (avatarCreatedAt) avatarCreatedAt.textContent = `Créé le: ${avatarData.createdAt ? new Date(avatarData.createdAt.toDate()).toLocaleDateString() : '-'}`;
                if (avatarStatus) avatarStatus.textContent = `Statut: ${avatarData.status || '-'}`;
            }
        } else {
            console.log('No avatar document found');
            // Aucun avatar trouvé, afficher les champs vides
            const avatarLifrasID = document.getElementById('avatarLifrasID');
            const avatarPhotoURL = document.getElementById('avatarPhotoURL');
            const avatarCreatedAt = document.getElementById('avatarCreatedAt');
            const avatarStatus = document.getElementById('avatarStatus');

            if (avatarLifrasID) avatarLifrasID.textContent = 'LifrasID: -';
            if (avatarPhotoURL) avatarPhotoURL.textContent = 'Photo URL: -';
            if (avatarCreatedAt) avatarCreatedAt.textContent = 'Créé le: -';
            if (avatarStatus) avatarStatus.textContent = 'Statut: -';
        }

        memberAvatar.classList.remove('loading');
    } catch (error) {
        console.error('Erreur lors du chargement de l\'avatar:', error);
        console.error('Stack trace:', error.stack);
        memberAvatar.src = '/avatars/default-avatar.svg';
        memberAvatar.classList.remove('loading');
        
        // Reset avatar information fields
        const avatarLifrasID = document.getElementById('avatarLifrasID');
        const avatarPhotoURL = document.getElementById('avatarPhotoURL');
        const avatarCreatedAt = document.getElementById('avatarCreatedAt');
        const avatarStatus = document.getElementById('avatarStatus');

        if (avatarLifrasID) avatarLifrasID.textContent = 'LifrasID: -';
        if (avatarPhotoURL) avatarPhotoURL.textContent = 'Photo URL: -';
        if (avatarCreatedAt) avatarCreatedAt.textContent = 'Créé le: -';
        if (avatarStatus) avatarStatus.textContent = 'Statut: -';
    }
} 