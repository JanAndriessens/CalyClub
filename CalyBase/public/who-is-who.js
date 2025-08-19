// Who is who - Annuaire des membres avec export multiformat
// Variables globales
let allMembers = [];
let filteredMembers = [];
let currentSort = 'nom';
let currentColumns = 4;
let hideNoPhoto = false;

// DOM Elements
const annuaireGrid = document.getElementById('annuaireGrid');
const loadingMessage = document.getElementById('loadingMessage');
const noMembersMessage = document.getElementById('noMembersMessage');
const memberCount = document.getElementById('memberCount');
const lastUpdated = document.getElementById('lastUpdated');
const sortSelect = document.getElementById('sortBy');
const hideNoPhotoCheckbox = document.getElementById('hideNoPhoto');
const exportBtn = document.getElementById('exportBtn');
const exportMenu = document.getElementById('exportMenu');
const printBtn = document.getElementById('printBtn');

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🎯 Who is who: Initializing...');
        
        // Attendre Firebase
        await waitForFirebaseReady();
        
        // Vérifier les permissions d'accès
        if (!await checkAccess()) {
            return;
        }
        
        // Configurer les event listeners
        setupEventListeners();
        
        // Charger les membres
        await loadMembersForDirectory();
        
        console.log('✅ Who is who: Initialization complete');
        
    } catch (error) {
        console.error('❌ Who is who: Error during initialization:', error);
        showError('Erreur lors de l\'initialisation de l\'annuaire');
    }
});

// Attendre que Firebase soit prêt
async function waitForFirebaseReady() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 30;
        
        const checkFirebase = () => {
            attempts++;
            
            if (typeof firebase !== 'undefined' && 
                firebase.apps && 
                firebase.apps.length > 0 && 
                window.db && 
                window.auth) {
                console.log('✅ Who is who: Firebase services ready');
                resolve();
                return;
            }
            
            if (attempts >= maxAttempts) {
                console.warn('⚠️ Who is who: Firebase timeout, proceeding anyway');
                resolve();
                return;
            }
            
            setTimeout(checkFirebase, 100);
        };
        
        checkFirebase();
    });
}

// Vérifier les permissions d'accès
async function checkAccess() {
    try {
        // Vérifier l'authentification
        if (!window.auth || !window.auth.currentUser) {
            console.log('🚫 Who is who: User not authenticated');
            alert('Vous devez être connecté pour accéder à l\'annuaire');
            window.location.href = '/membres.html';
            return false;
        }
        
        // Vérifier les permissions de visualisation des membres
        if (window.memberPermissions && typeof window.canViewMembers === 'function') {
            const canView = await window.canViewMembers();
            if (!canView) {
                console.log('🚫 Who is who: No permission to view members');
                alert('Vous n\'avez pas les permissions pour consulter l\'annuaire des membres');
                window.location.href = '/membres.html';
                return false;
            }
        }
        
        console.log('✅ Who is who: Access granted');
        return true;
        
    } catch (error) {
        console.error('❌ Who is who: Error checking access:', error);
        alert('Erreur lors de la vérification des permissions');
        window.location.href = '/membres.html';
        return false;
    }
}

// Charger tous les membres avec leurs avatars
async function loadMembersForDirectory() {
    try {
        showLoading(true);
        console.log('📋 Who is who: Loading members...');
        
        // Récupérer tous les membres
        const membersSnapshot = await window.db.collection('membres').get();
        allMembers = [];
        
        // Traiter chaque membre
        for (const doc of membersSnapshot.docs) {
            const memberData = doc.data();
            
            if (memberData.lifrasID && memberData.nom && memberData.prenom) {
                // Récupérer l'avatar
                let avatarURL = null;
                try {
                    const avatarQuery = await window.db.collection('avatars')
                        .where('lifrasID', '==', memberData.lifrasID)
                        .limit(1)
                        .get();
                    
                    if (!avatarQuery.empty) {
                        const avatarData = avatarQuery.docs[0].data();
                        avatarURL = avatarData.photoURL;
                    }
                } catch (avatarError) {
                    console.warn(`Avatar error for ${memberData.lifrasID}:`, avatarError);
                }
                
                allMembers.push({
                    id: doc.id,
                    lifrasID: memberData.lifrasID,
                    nom: memberData.nom,
                    prenom: memberData.prenom,
                    avatarURL: avatarURL,
                    hasCustomAvatar: !!avatarURL,
                    // Autres champs utiles pour export
                    validiteCertificatMedical: memberData.validiteCertificatMedical,
                    medical: calculateMedicalStatus(memberData.validiteCertificatMedical)
                });
            }
        }
        
        console.log(`✅ Who is who: Loaded ${allMembers.length} members`);
        
        // Appliquer les filtres et trier
        applyFiltersAndSort();
        
        // Mettre à jour la date
        updateLastUpdated();
        
        showLoading(false);
        
    } catch (error) {
        console.error('❌ Who is who: Error loading members:', error);
        showError('Erreur lors du chargement des membres');
        showLoading(false);
    }
}

// Calculer le statut médical (réutilise la logique de membres.js)
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

// Appliquer les filtres et trier
function applyFiltersAndSort() {
    console.log(`🔍 Who is who: Applying filters - hideNoPhoto: ${hideNoPhoto}, sort: ${currentSort}`);
    
    // Filtrer
    filteredMembers = allMembers.filter(member => {
        if (hideNoPhoto && !member.hasCustomAvatar) {
            return false;
        }
        return true;
    });
    
    // Trier
    filteredMembers.sort((a, b) => {
        let aValue, bValue;
        
        switch (currentSort) {
            case 'nom':
                aValue = a.nom.toLowerCase();
                bValue = b.nom.toLowerCase();
                break;
            case 'prenom':
                aValue = a.prenom.toLowerCase();
                bValue = b.prenom.toLowerCase();
                break;
            case 'lifrasID':
                aValue = a.lifrasID;
                bValue = b.lifrasID;
                break;
            default:
                aValue = a.nom.toLowerCase();
                bValue = b.nom.toLowerCase();
        }
        
        return aValue.localeCompare(bValue, 'fr', { sensitivity: 'base' });
    });
    
    console.log(`📊 Who is who: ${filteredMembers.length} members after filtering/sorting`);
    
    // Afficher les résultats
    displayMembers();
    updateMemberCount();
}

// Afficher les membres dans la grille
function displayMembers() {
    if (filteredMembers.length === 0) {
        annuaireGrid.style.display = 'none';
        noMembersMessage.style.display = 'block';
        return;
    }
    
    annuaireGrid.style.display = 'grid';
    noMembersMessage.style.display = 'none';
    
    // Mettre à jour le nombre de colonnes
    annuaireGrid.style.gridTemplateColumns = `repeat(${currentColumns}, 1fr)`;
    
    // Créer les cartes
    annuaireGrid.innerHTML = '';
    
    filteredMembers.forEach(member => {
        const memberCard = createMemberCard(member);
        annuaireGrid.appendChild(memberCard);
    });
    
    // Charger les avatars de manière asynchrone
    loadAvatarsAsync();
}

// Créer une carte membre
function createMemberCard(member) {
    const card = document.createElement('div');
    card.className = 'member-card';
    card.setAttribute('data-lifras-id', member.lifrasID);
    
    card.innerHTML = `
        <div class="member-avatar-container">
            <img src="/avatars/default-avatar.svg" 
                 alt="${member.prenom} ${member.nom}" 
                 class="member-avatar"
                 data-lifras-id="${member.lifrasID}">
        </div>
        <div class="member-info">
            <div class="member-prenom">${member.prenom}</div>
            <div class="member-nom">${member.nom.toUpperCase()}</div>
        </div>
    `;
    
    return card;
}

// Charger les avatars de manière asynchrone
async function loadAvatarsAsync() {
    const avatarImages = document.querySelectorAll('.member-avatar');
    
    for (const img of avatarImages) {
        const lifrasID = img.getAttribute('data-lifras-id');
        const member = filteredMembers.find(m => m.lifrasID === lifrasID);
        
        if (member && member.avatarURL) {
            // Utiliser le système robuste d'avatar si disponible
            if (window.AvatarUtils) {
                window.AvatarUtils.setupRobustAvatar(img, member.avatarURL, lifrasID, {
                    showLoading: false
                });
            } else {
                // Fallback simple
                img.src = member.avatarURL;
                img.onerror = () => {
                    img.src = '/avatars/default-avatar.svg';
                };
            }
        }
    }
}

// Configurer les event listeners
function setupEventListeners() {
    // Tri
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            applyFiltersAndSort();
        });
    }
    
    // Filtre sans photo
    if (hideNoPhotoCheckbox) {
        hideNoPhotoCheckbox.addEventListener('change', (e) => {
            hideNoPhoto = e.target.checked;
            applyFiltersAndSort();
        });
    }
    
    // Boutons de layout
    document.querySelectorAll('.layout-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cols = parseInt(e.target.getAttribute('data-cols'));
            setColumns(cols);
            
            // Mettre à jour l'état actif
            document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
    
    // Export dropdown
    if (exportBtn && exportMenu) {
        exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            exportMenu.classList.toggle('show');
        });
        
        // Fermer le dropdown en cliquant ailleurs
        document.addEventListener('click', () => {
            exportMenu.classList.remove('show');
        });
        
        // Options d'export
        exportMenu.addEventListener('click', (e) => {
            e.preventDefault();
            const exportType = e.target.closest('[data-export]')?.getAttribute('data-export');
            if (exportType) {
                handleExport(exportType);
                exportMenu.classList.remove('show');
            }
        });
    }
    
    // Bouton imprimer
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            handlePrint();
        });
    }
}

// Changer le nombre de colonnes
function setColumns(cols) {
    currentColumns = cols;
    if (annuaireGrid) {
        annuaireGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    }
}

// Mettre à jour le compteur de membres
function updateMemberCount() {
    if (memberCount) {
        memberCount.textContent = filteredMembers.length;
    }
}

// Mettre à jour la date de dernière mise à jour
function updateLastUpdated() {
    if (lastUpdated) {
        const now = new Date();
        lastUpdated.textContent = now.toLocaleDateString('fr-FR') + ' à ' + now.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Gestion de l'export
async function handleExport(type) {
    try {
        console.log(`📤 Who is who: Exporting as ${type}...`);
        
        switch (type) {
            case 'csv-links':
                await exportCSVWithLinks();
                break;
            case 'zip-package':
                await exportZipPackage();
                break;
            case 'pdf':
                await exportPDF();
                break;
            case 'json':
                await exportJSON();
                break;
            default:
                throw new Error('Type d\'export non supporté');
        }
        
        console.log(`✅ Who is who: Export ${type} completed`);
        
    } catch (error) {
        console.error(`❌ Who is who: Export ${type} failed:`, error);
        alert(`Erreur lors de l'export ${type}: ${error.message}`);
    }
}

// Export CSV avec liens
async function exportCSVWithLinks() {
    const csvData = [
        ['Prénom', 'Nom', 'Avatar_URL', 'Lifras_ID', 'Statut_Medical']
    ];
    
    filteredMembers.forEach(member => {
        csvData.push([
            member.prenom,
            member.nom.toUpperCase(),
            member.avatarURL || '/avatars/default-avatar.svg',
            member.lifrasID,
            member.medical
        ]);
    });
    
    const csvContent = csvData.map(row => 
        row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `annuaire_calybase_${getCurrentDateString()}.csv`;
    
    if (window.saveAs) {
        window.saveAs(blob, filename);
    } else {
        // Fallback
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }
}

// Export JSON
async function exportJSON() {
    const jsonData = {
        generated: new Date().toISOString(),
        total_members: filteredMembers.length,
        filters: {
            hide_no_photo: hideNoPhoto,
            sort_by: currentSort
        },
        members: filteredMembers.map(member => ({
            prenom: member.prenom,
            nom: member.nom.toUpperCase(),
            avatar_url: member.avatarURL,
            lifras_id: member.lifrasID,
            medical_status: member.medical,
            has_custom_avatar: member.hasCustomAvatar
        }))
    };
    
    const jsonContent = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const filename = `annuaire_calybase_${getCurrentDateString()}.json`;
    
    if (window.saveAs) {
        window.saveAs(blob, filename);
    } else {
        // Fallback
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }
}

// Export ZIP avec images et CSV
async function exportZipPackage() {
    if (!window.JSZip) {
        throw new Error('Librairie JSZip non disponible');
    }
    
    const zip = new JSZip();
    const csvData = [
        ['Prénom', 'Nom', 'Avatar_File', 'Lifras_ID', 'Statut_Medical']
    ];
    
    // Créer le dossier avatars
    const avatarsFolder = zip.folder('avatars');
    
    // Traiter chaque membre
    for (let i = 0; i < filteredMembers.length; i++) {
        const member = filteredMembers[i];
        
        // Mettre à jour le statut (optionnel)
        if (typeof updateExportProgress === 'function') {
            updateExportProgress(i + 1, filteredMembers.length);
        }
        
        let avatarFilename = 'default_avatar.svg';
        
        try {
            if (member.avatarURL && member.hasCustomAvatar) {
                // Télécharger l'image
                const response = await fetch(member.avatarURL);
                if (response.ok) {
                    const imageBlob = await response.blob();
                    const extension = getImageExtension(member.avatarURL) || 'jpg';
                    avatarFilename = `${member.lifrasID}_${sanitizeFilename(member.prenom)}_${sanitizeFilename(member.nom)}.${extension}`;
                    
                    // Ajouter au ZIP
                    avatarsFolder.file(avatarFilename, imageBlob);
                } else {
                    console.warn(`Failed to download avatar for ${member.lifrasID}: ${response.status}`);
                }
            } else {
                // Utiliser l'avatar par défaut
                try {
                    const defaultResponse = await fetch('/avatars/default-avatar.svg');
                    if (defaultResponse.ok) {
                        const defaultBlob = await defaultResponse.blob();
                        avatarsFolder.file('default_avatar.svg', defaultBlob);
                    }
                } catch (defaultError) {
                    console.warn('Could not add default avatar to ZIP:', defaultError);
                }
            }
        } catch (error) {
            console.warn(`Error processing avatar for ${member.lifrasID}:`, error);
            avatarFilename = 'default_avatar.svg';
        }
        
        // Ajouter à CSV
        csvData.push([
            member.prenom,
            member.nom.toUpperCase(),
            `avatars/${avatarFilename}`,
            member.lifrasID,
            member.medical
        ]);
    }
    
    // Créer le CSV
    const csvContent = csvData.map(row => 
        row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    // Ajouter le CSV au ZIP
    zip.file('annuaire.csv', csvContent);
    
    // Ajouter un README
    const readmeContent = `# Annuaire CalyBase - Export complet

## Contenu
- annuaire.csv : Données des membres avec références aux images
- avatars/ : Dossier contenant toutes les photos des membres

## Utilisation avec InDesign
1. Ouvrir InDesign
2. Créer votre mise en page
3. Utiliser "Données" > "Fusion des données"
4. Sélectionner le fichier annuaire.csv
5. Les images seront automatiquement liées depuis le dossier avatars/

## Statistiques
- Total membres: ${filteredMembers.length}
- Avec photo personnalisée: ${filteredMembers.filter(m => m.hasCustomAvatar).length}
- Généré le: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}

Généré par CalyBase - Système de gestion des membres
`;
    
    zip.file('README.txt', readmeContent);
    
    // Générer et télécharger le ZIP
    const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });
    
    const filename = `annuaire_calybase_complet_${getCurrentDateString()}.zip`;
    
    if (window.saveAs) {
        window.saveAs(zipBlob, filename);
    } else {
        // Fallback
        const url = window.URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }
}

// Export PDF optimisé pour impression
async function exportPDF() {
    try {
        // Créer une nouvelle fenêtre pour le PDF
        const printWindow = window.open('', '_blank');
        
        // Générer le HTML pour le PDF
        const pdfHTML = generatePrintHTML();
        
        // Écrire le HTML dans la nouvelle fenêtre
        printWindow.document.write(pdfHTML);
        printWindow.document.close();
        
        // Attendre que les images se chargent
        await waitForImagesLoad(printWindow);
        
        // Lancer l'impression (qui peut être sauvée en PDF)
        printWindow.print();
        
        // Fermer la fenêtre après un délai
        setTimeout(() => {
            printWindow.close();
        }, 1000);
        
    } catch (error) {
        console.error('PDF export error:', error);
        
        // Fallback: impression directe de la page actuelle
        alert('Export PDF via la nouvelle fenêtre non disponible. Utilisation de l\'impression directe.\n\nCliquez sur OK puis utilisez Ctrl+P (ou Cmd+P) et sélectionnez "Enregistrer au format PDF".');
        handlePrint();
    }
}

// Générer HTML pour impression/PDF
function generatePrintHTML() {
    const currentDate = new Date().toLocaleDateString('fr-FR');
    const currentTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    let membersHTML = '';
    filteredMembers.forEach(member => {
        const avatarSrc = member.avatarURL || '/avatars/default-avatar.svg';
        membersHTML += `
            <div class="member-card">
                <div class="member-avatar-container">
                    <img src="${avatarSrc}" alt="${member.prenom} ${member.nom}" class="member-avatar">
                </div>
                <div class="member-info">
                    <div class="member-prenom">${member.prenom}</div>
                    <div class="member-nom">${member.nom.toUpperCase()}</div>
                </div>
            </div>
        `;
    });
    
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Annuaire CalyBase - ${currentDate}</title>
    <style>
        @page { margin: 1cm; size: A4; }
        * { box-sizing: border-box; }
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20pt; 
            background: white;
            font-size: 12pt;
            line-height: 1.4;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30pt; 
            border-bottom: 2pt solid #333;
            padding-bottom: 15pt;
        }
        .header h1 { 
            margin: 0; 
            font-size: 24pt; 
            color: #333; 
        }
        .header p { 
            margin: 5pt 0 0 0; 
            color: #666; 
            font-size: 11pt;
        }
        .annuaire-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20pt;
            margin-bottom: 30pt;
        }
        .member-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 15pt;
            border: 1pt solid #ddd;
            border-radius: 8pt;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .member-avatar-container {
            width: 60pt;
            height: 60pt;
            margin-bottom: 10pt;
            border: 2pt solid #333;
            border-radius: 50%;
            overflow: hidden;
        }
        .member-avatar {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .member-prenom {
            font-size: 11pt;
            color: #333;
            font-weight: normal;
            margin-bottom: 3pt;
        }
        .member-nom {
            font-size: 12pt;
            color: #000;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5pt;
        }
        .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 10pt;
            color: #666;
            border-top: 1pt solid #ddd;
            padding: 10pt;
            background: white;
        }
        @media print and (max-width: 8in) {
            .annuaire-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📋 Annuaire CalyBase - Who is who?</h1>
        <p>${filteredMembers.length} membres • Généré le ${currentDate} à ${currentTime}</p>
    </div>
    
    <div class="annuaire-grid">
        ${membersHTML}
    </div>
    
    <div class="footer">
        CalyBase - Système de gestion des membres • ${currentDate}
    </div>
</body>
</html>
    `;
}

// Attendre que les images se chargent dans une fenêtre
function waitForImagesLoad(targetWindow) {
    return new Promise((resolve) => {
        const images = targetWindow.document.querySelectorAll('img');
        let loadedCount = 0;
        const totalImages = images.length;
        
        if (totalImages === 0) {
            resolve();
            return;
        }
        
        const checkComplete = () => {
            loadedCount++;
            if (loadedCount >= totalImages) {
                setTimeout(resolve, 500); // Délai supplémentaire pour sécurité
            }
        };
        
        images.forEach(img => {
            if (img.complete) {
                checkComplete();
            } else {
                img.onload = checkComplete;
                img.onerror = checkComplete;
            }
        });
        
        // Timeout de sécurité
        setTimeout(resolve, 5000);
    });
}

// Gestion de l'impression
function handlePrint() {
    // Mettre à jour la date d'impression
    const printDate = document.getElementById('printDate');
    if (printDate) {
        printDate.textContent = new Date().toLocaleDateString('fr-FR');
    }
    
    // Lancer l'impression
    window.print();
}

// Utilitaires
function getCurrentDateString() {
    const now = new Date();
    return now.toISOString().split('T')[0].replace(/-/g, '');
}

function showLoading(show) {
    if (loadingMessage) {
        loadingMessage.style.display = show ? 'block' : 'none';
    }
    if (annuaireGrid) {
        annuaireGrid.style.display = show ? 'none' : 'grid';
    }
}

function showError(message) {
    alert(message);
}

// Fonctions utilitaires pour export
function getImageExtension(url) {
    if (!url) return null;
    const match = url.match(/\.(jpg|jpeg|png|gif|svg|webp)(\?|$)/i);
    return match ? match[1].toLowerCase() : null;
}

function sanitizeFilename(str) {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
        .replace(/[^a-zA-Z0-9]/g, '_')   // Remplacer caractères spéciaux par _
        .replace(/_+/g, '_')             // Consolider les _ multiples
        .replace(/^_|_$/g, '')           // Supprimer _ en début/fin
        .toLowerCase();
}

// Rendre les fonctions disponibles globalement pour debug
window.whoIsWhoDebug = {
    allMembers: () => allMembers,
    filteredMembers: () => filteredMembers,
    reloadMembers: loadMembersForDirectory,
    exportTest: handleExport,
    testZip: () => exportZipPackage(),
    testPDF: () => exportPDF()
};