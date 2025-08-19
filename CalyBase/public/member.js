// Fonction pour importer les membres depuis un fichier CSV
async function importMembers(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const rows = text.split('\n');
        const headers = rows[0].split(',').map(h => h.trim());
        
        // Vérifier que les colonnes requises sont présentes
        const requiredColumns = ['lifrasid', 'prenom', 'nom', 'email'];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        
        if (missingColumns.length > 0) {
            throw new Error(`Colonnes manquantes dans le fichier CSV : ${missingColumns.join(', ')}`);
        }

        // Obtenir les index des colonnes
        const lifrasidIndex = headers.indexOf('lifrasid');
        const prenomIndex = headers.indexOf('prenom');
        const nomIndex = headers.indexOf('nom');
        const emailIndex = headers.indexOf('email');
        const telephoneIndex = headers.indexOf('telephone');
        const adresseIndex = headers.indexOf('adresse');
        const codePostalIndex = headers.indexOf('codePostal');
        const villeIndex = headers.indexOf('ville');
        const paysIndex = headers.indexOf('pays');
        const dateNaissanceIndex = headers.indexOf('dateNaissance');
        const dateAdhesionIndex = headers.indexOf('dateAdhesion');
        const statutIndex = headers.indexOf('statut');

        // Supprimer tous les membres existants
        const membersSnapshot = await firebase.firestore().collection('membres').get();
        const batch = firebase.firestore().batch();
        membersSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        // Importer les nouveaux membres
        const newBatch = firebase.firestore().batch();
        const membresCollection = firebase.firestore().collection('membres');

        for (let i = 1; i < rows.length; i++) {
            if (!rows[i].trim()) continue;

            const values = rows[i].split(',').map(v => v.trim());
            const lifrasid = values[lifrasidIndex];

            if (!lifrasid) {
                console.warn(`Ligne ${i + 1} ignorée : LIFRAS ID manquant`);
                continue;
            }

            const memberData = {
                lifrasid: lifrasid,
                prenom: values[prenomIndex] || '',
                nom: values[nomIndex] || '',
                email: values[emailIndex] || '',
                telephone: values[telephoneIndex] || '',
                adresse: values[adresseIndex] || '',
                codePostal: values[codePostalIndex] || '',
                ville: values[villeIndex] || '',
                pays: values[paysIndex] || '',
                dateNaissance: values[dateNaissanceIndex] || '',
                dateAdhesion: values[dateAdhesionIndex] || '',
                statut: values[statutIndex] || 'actif'
            };

            // Utiliser le LIFRAS ID comme identifiant du document
            const memberRef = membresCollection.doc(lifrasid);
            newBatch.set(memberRef, memberData);
        }

        await newBatch.commit();
        console.log('Importation des membres terminée avec succès');
        alert('Importation des membres terminée avec succès');
        
        // Recharger la liste des membres
        loadMembers();
    } catch (error) {
        console.error('Erreur lors de l\'importation des membres:', error);
        alert('Erreur lors de l\'importation des membres : ' + error.message);
    }
}

// Fonction pour charger les membres
async function loadMembers() {
    try {
        const membersList = document.getElementById('membersList');
        membersList.innerHTML = '';

        const membersSnapshot = await firebase.firestore().collection('membres').get();
        const members = [];
        
        membersSnapshot.forEach(doc => {
            const memberData = doc.data();
            members.push({
                id: memberData.lifrasid,
                prenom: memberData.prenom || '',
                nom: memberData.nom || '',
                email: memberData.email || '',
                telephone: memberData.telephone || '',
                adresse: memberData.adresse || '',
                codePostal: memberData.codePostal || '',
                ville: memberData.ville || '',
                pays: memberData.pays || '',
                dateNaissance: memberData.dateNaissance || '',
                dateAdhesion: memberData.dateAdhesion || '',
                statut: memberData.statut || 'actif'
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
            membersList.appendChild(memberCard);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des membres:', error);
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

    const infoContainer = document.createElement('div');
    infoContainer.className = 'member-info';

    const nameDisplay = document.createElement('div');
    nameDisplay.className = 'member-name';
    nameDisplay.textContent = `${member.prenom} ${member.nom}`;

    const emailDisplay = document.createElement('div');
    emailDisplay.className = 'member-email';
    emailDisplay.textContent = member.email;

    const telephoneDisplay = document.createElement('div');
    telephoneDisplay.className = 'member-telephone';
    telephoneDisplay.textContent = member.telephone;

    const adresseDisplay = document.createElement('div');
    adresseDisplay.className = 'member-adresse';
    adresseDisplay.textContent = `${member.adresse}, ${member.codePostal} ${member.ville}, ${member.pays}`;

    const dateNaissanceDisplay = document.createElement('div');
    dateNaissanceDisplay.className = 'member-date-naissance';
    dateNaissanceDisplay.textContent = `Date de naissance : ${member.dateNaissance}`;

    const dateAdhesionDisplay = document.createElement('div');
    dateAdhesionDisplay.className = 'member-date-adhesion';
    dateAdhesionDisplay.textContent = `Date d'adhésion : ${member.dateAdhesion}`;

    const statutDisplay = document.createElement('div');
    statutDisplay.className = 'member-statut';
    statutDisplay.textContent = `Statut : ${member.statut}`;

    infoContainer.appendChild(nameDisplay);
    infoContainer.appendChild(emailDisplay);
    infoContainer.appendChild(telephoneDisplay);
    infoContainer.appendChild(adresseDisplay);
    infoContainer.appendChild(dateNaissanceDisplay);
    infoContainer.appendChild(dateAdhesionDisplay);
    infoContainer.appendChild(statutDisplay);

    card.appendChild(avatarContainer);
    card.appendChild(infoContainer);

    return card;
} 