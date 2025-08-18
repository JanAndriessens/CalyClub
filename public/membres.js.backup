// DOM Elements
const membresTableBody = document.getElementById('membresTableBody');
const searchInput = document.getElementById('searchInput');
const importExcelBtn = document.getElementById('importExcelBtn');
const excelFileInput = document.getElementById('excelFileInput');
const deleteAllBtn = document.getElementById('deleteAllBtn');
const updateMedicalBtn = document.getElementById('updateMedicalBtn');

// Add this variable at the top of the file with other DOM elements
let currentMembers = [];

// Create module-specific logger
const logger = new Logger('Membres');

// Debug function to check library availability
function checkLibraries() {
    logger.debug('Library availability check', {
        firebase: typeof firebase !== 'undefined',
        xlsx: typeof XLSX !== 'undefined',
        encoding: typeof Encoding !== 'undefined',
        db: !!window.db,
        auth: !!window.auth
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    logger.info('Membres module initializing');
    logger.time('membres-initialization');
    
    // Initial library check
    checkLibraries();
    
    // MOBILE OPTIMIZATION: Use centralized device detection
    const isMobileDevice = window.DeviceUtils?.isMobileDevice || false;
    const checkInterval = window.DeviceUtils?.checkInterval || 100;
    const timeout = window.DeviceUtils?.firebaseTimeout || 3000;
    
    logger.debug('Device optimization', {
        isMobile: isMobileDevice,
        checkInterval,
        timeout
    });

    const firebaseReady = new Promise((resolve) => {
        const checkFirebase = setInterval(() => {
            if (window.db && window.auth) {
                logger.info('Firebase services ready');
                clearInterval(checkFirebase);
                resolve(true);
            }
        }, checkInterval);
        
        setTimeout(() => {
            logger.warn('Firebase initialization timeout', { 
                device: isMobileDevice ? 'mobile' : 'desktop',
                timeout: timeout
            });
            clearInterval(checkFirebase);
            resolve(false);
        }, timeout);
    });

    // ⚡ Start loading members immediately while Firebase initializes
    const loadMembersPromise = firebaseReady.then(async (ready) => {
        if (ready && window.db) {
            console.log('🔄 Loading members...');
            await loadMembers();
        } else {
            console.error('❌ Firebase not ready, showing error');
            const membresTableBody = document.getElementById('membresTableBody');
            if (membresTableBody) {
                membresTableBody.innerHTML = '<tr><td colspan="5" class="error">Base de données non disponible. Rafraîchir la page.</td></tr>';
            }
        }
    });

    // ⚡ Initialize permissions in parallel (non-blocking)
    const permissionsPromise = firebaseReady.then(async (ready) => {
        if (ready) {
            try {
                console.log('🔐 Initializing permissions (parallel)...');
                await initializeMemberPermissions();
            } catch (error) {
                console.warn('⚠️ Permissions initialization failed:', error);
            }
        }
    });

    // ⚡ Don't wait for permissions - let them load in background
    await loadMembersPromise;
    
    // Let permissions finish in background
    permissionsPromise.catch(error => console.warn('Background permissions failed:', error));

    // Setup event listeners
    importExcelBtn.addEventListener('click', () => {
        excelFileInput.click();
    });

    excelFileInput.addEventListener('change', async (e) => {
        console.log('Excel file input changed');
        const file = e.target.files[0];
        if (!file) {
            console.log('No file selected');
            return;
        }

        console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);

        // Check file extension
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!['xls', 'xlsx'].includes(fileExtension)) {
            alert('Seuls les fichiers .xls et .xlsx sont autorisés');
            return;
        }

        // Check if libraries are loaded
        if (typeof XLSX === 'undefined') {
            alert('La bibliothèque Excel n\'est pas chargée. Veuillez rafraîchir la page.');
            return;
        }

        if (!window.db) {
            alert('La base de données n\'est pas connectée. Veuillez rafraîchir la page.');
            return;
        }

        try {
            console.log('Début de l\'importation du fichier:', file.name);
            
            // Show loading message
            const loadingMessage = document.createElement('div');
            loadingMessage.id = 'loading-message';
            loadingMessage.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #2196F3; color: white; padding: 20px; border-radius: 5px; z-index: 10000;';
            loadingMessage.textContent = 'Importation en cours...';
            document.body.appendChild(loadingMessage);

            const data = await readExcelFile(file);
            console.log(`${data.length} lignes lues du fichier Excel`);
            
            if (data.length === 0) {
                throw new Error('Aucune donnée trouvée dans le fichier Excel');
            }

            await importMembres(data);
            
            // Remove loading message
            const msg = document.getElementById('loading-message');
            if (msg) msg.remove();
            
        } catch (error) {
            console.error('Erreur lors de l\'importation:', error);
            alert('Erreur lors de l\'importation: ' + error.message);
            
            // Remove loading message
            const msg = document.getElementById('loading-message');
            if (msg) msg.remove();
        }
        
        // Clear the file input
        e.target.value = '';
    });

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterMembers(searchTerm);
    });

    deleteAllBtn.addEventListener('click', async () => {
        if (confirm('Êtes-vous sûr de vouloir supprimer tous les membres ?')) {
            try {
                await deleteAllMembers();
                loadMembers();
            } catch (error) {
                console.error('Erreur lors de la suppression:', error);
                alert('Erreur lors de la suppression: ' + error.message);
            }
        }
    });

    updateMedicalBtn.addEventListener('click', async () => {
        if (confirm('Êtes-vous sûr de vouloir mettre à jour le champ Medical pour tous les membres ?')) {
            try {
                await updateAllMembersMedical();
                loadMembers();
            } catch (error) {
                console.error('Erreur lors de la mise à jour:', error);
                alert('Erreur lors de la mise à jour: ' + error.message);
            }
        }
    });
});

/**
 * BELANGRIJK: De veldnamen in deze functie MOETEN exact overeenkomen met de kolommen in het Excel bestand.
 * De volgorde en namen van de velden mogen NIET worden aangepast.
 * 
 * Excel kolom structuur:
 * 1. LifrasID
 * 2. Nr.Febras
 * 3. Nom
 * 4. Prenom
 * 5. Adresse
 * 6. Code postal
 * 7. Localité
 * 8. Email 1
 * 9. Email 2
 * 10. Email 3
 * 11. Téléphone privé
 * 12. Téléphone bureau
 * 13. GSM 1
 * 14. GSM 2
 * 15. GSM 3
 * 16. Date du certificat médical
 * 17. Validité du certificat médical
 * 18. Date du E.C.G.
 * 19. Validité du E.C.G.
 * 20. ICE
 * 21. Description
 * 22. Pays
 * 23. Date de naissance
 * 24. Lieu de naissance
 * 25. Langue
 * 26. Nationalité
 * 27. Newsletter
 * 28. Type de certif.1
 * 29. Type de certif.2
 * 30. Plongeur
 * 31. Apnéiste
 * 32. Gas Blender
 * 33. Nitrox
 * 34. Plongée Souterraine
 * 35. Plongeur Adapté
 * 36. Qualification PPA
 * 37. Qualification VE
 * 38. Technique Subaquatique
 * 39. Trimix
 * 40. Date dernière inscription
 * 41. Validité CFPS
 * 42. ADEPS
 * 43. Plongée enfant encadrant
 * 44. Photographe
 * 45. Archéologue
 * 46. Médecin
 * 47. Dernière modif.
 * 48. Licence FD
 */
async function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        // Check if XLSX library is available
        if (typeof XLSX === 'undefined') {
            console.error('XLSX library not loaded');
            reject(new Error('XLSX library not loaded. Please refresh the page and try again.'));
            return;
        }

        const reader = new FileReader();
        
        reader.onload = async function(e) {
            try {
                console.log('Starting Excel file processing...');
                console.log('XLSX library version:', XLSX.version);
                const data = new Uint8Array(e.target.result);
                
                // Aangepaste opties voor SheetJS
                const workbook = XLSX.read(data, { 
                    type: 'array',
                    codepage: 1252, // Windows-1252 voor Europese karakters
                    cellDates: true,
                    cellNF: false,
                    cellText: false,
                    WTF: true,
                    raw: false
                });

                console.log('Workbook sheets:', workbook.SheetNames);
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                
                // Converteer naar JSON met specifieke opties
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
                    raw: false,
                    defval: '',
                    dateNF: 'yyyy-mm-dd',
                    header: 1,
                    blankrows: false
                });

                console.log('Raw Excel data:', jsonData);
                console.log('Number of rows:', jsonData.length);
                console.log('Excel headers:', jsonData[0]); // Debug: toon headers
                console.log('First row:', jsonData[1]); // Debug: toon eerste rij

                // Verwerk de data, beginnend vanaf de tweede rij (index 1)
                const processedData = jsonData.slice(1).map((row, index) => {
                    console.log(`Processing row ${index + 1}:`, row);
                    
                    if (!row[0]) {
                        console.log(`Skipping empty row ${index + 1}`);
                        return null;
                    }

                    // Converteer en reinig elke cel
                    const cleanRow = row.map((cell, cellIndex) => {
                        if (cell === undefined || cell === null) {
                            console.log(`Empty cell at row ${index + 1}, column ${cellIndex}`);
                            return '';
                        }
                        const str = String(cell);
                        const cleaned = str
                            .replace(/¡/g, 'i')
                            .replace(/[^\x00-\x7F]/g, '')
                            .trim();
                        console.log(`Cell ${cellIndex} cleaned: "${str}" -> "${cleaned}"`);
                        return cleaned;
                    });

                    // Maak het object met de exacte kolomtoewijzing volgens de Excel structuur
                    const processedRow = {
                        lifrasID: cleanRow[0] || '',           // LifrasID
                        nrFebras: cleanRow[1] || '',          // Nr.Febras
                        nom: cleanRow[2] || '',               // Nom
                        prenom: cleanRow[3] || '',            // Prenom
                        adresse: cleanRow[4] || '',           // Adresse
                        codePostal: cleanRow[5] || '',        // Code postal
                        localite: cleanRow[6] || '',          // Localité
                        email1: cleanRow[7] || '',            // Email 1
                        email2: cleanRow[8] || '',            // Email 2
                        email3: cleanRow[9] || '',            // Email 3
                        telephonePrive: cleanRow[10] || '',   // Téléphone privé
                        telephoneBureau: cleanRow[11] || '',  // Téléphone bureau
                        gsm1: cleanRow[12] || '',             // GSM 1
                        gsm2: cleanRow[13] || '',             // GSM 2
                        gsm3: cleanRow[14] || '',             // GSM 3
                        dateCertificatMedical: cleanRow[15] || '', // Date du certificat médical
                        validiteCertificatMedical: cleanRow[16] || '', // Validité du certificat médical
                        dateECG: cleanRow[17] || '',          // Date du E.C.G.
                        validiteECG: cleanRow[18] || '',      // Validité du E.C.G.
                        ice: cleanRow[19] || '',              // ICE
                        description: cleanRow[20] || '',      // Description
                        pays: cleanRow[21] || '',             // Pays
                        dateNaissance: cleanRow[22] || '',    // Date de naissance
                        lieuNaissance: cleanRow[23] || '',    // Lieu de naissance
                        langue: cleanRow[24] || '',           // Langue
                        nationalite: cleanRow[25] || '',      // Nationalité
                        newsletter: cleanRow[26] || '',       // Newsletter
                        typeCertif1: cleanRow[27] || '',      // Type de certif.1
                        typeCertif2: cleanRow[28] || '',      // Type de certif.2
                        plongeur: cleanRow[29] || '',         // Plongeur
                        apneiste: cleanRow[30] || '',         // Apnéiste
                        gasBlender: cleanRow[31] || '',       // Gas Blender
                        nitrox: cleanRow[32] || '',           // Nitrox
                        plongeeSouterraine: cleanRow[33] || '', // Plongée Souterraine
                        plongeurAdapte: cleanRow[34] || '',   // Plongeur Adapté
                        qualificationPPA: cleanRow[35] || '', // Qualification PPA
                        qualificationVE: cleanRow[36] || '',  // Qualification VE
                        techniqueSubaquatique: cleanRow[37] || '', // Technique Subaquatique
                        trimix: cleanRow[38] || '',           // Trimix
                        dateDerniereInscription: cleanRow[39] || '', // Date dernière inscription
                        validiteCFPS: cleanRow[40] || '',     // Validité CFPS
                        adeps: cleanRow[41] || '',            // ADEPS
                        plongeeEnfantEncadrant: cleanRow[42] || '', // Plongée enfant encadrant
                        photographe: cleanRow[43] || '',      // Photographe
                        archeologue: cleanRow[44] || '',      // Archéologue
                        medecin: cleanRow[45] || '',          // Médecin
                        derniereModif: cleanRow[46] || '',    // Dernière modif.
                        licenceFD: cleanRow[47] || '',         // Licence FD
                        medical: cleanRow[48] || ''            // Medical
                    };

                    console.log('Processed row:', processedRow);
                    return processedRow;
                }).filter(row => row !== null);

                console.log('Final processed data:', processedData);
                console.log('Number of processed rows:', processedData.length);
                
                if (processedData.length === 0) {
                    console.error('No data was processed from the Excel file');
                    reject(new Error('No data was processed from the Excel file'));
                    return;
                }

                resolve(processedData);
            } catch (error) {
                console.error('Error processing Excel file:', error);
                reject(error);
            }
        };

        reader.onerror = function(error) {
            console.error('Error reading file:', error);
            reject(error);
        };

        reader.readAsArrayBuffer(file);
    });
}

async function importMembres(data) {
    try {
        console.log('Starting member import...');
        console.log('Input data:', data);
        
        // Récupérer tous les avatars existants
        console.log('Fetching existing avatars...');
        const existingAvatarsSnapshot = await window.db.collection('avatars').get();
        const existingAvatars = new Map();
        existingAvatarsSnapshot.forEach(doc => {
            const avatar = doc.data();
            if (avatar.lifrasID && avatar.photo) {
                existingAvatars.set(avatar.lifrasID, avatar.photo);
            }
        });
        console.log('Found existing avatars:', existingAvatars.size);

        // Supprimer tous les membres existants
        console.log('Deleting existing members...');
        const batch = window.db.batch();
        const membersSnapshot = await window.db.collection('membres').get();
        membersSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log('Existing members deleted');

        // Importer les nouveaux membres
        console.log('Importing new members...');
        const newBatch = window.db.batch();
        let count = 0;
        let batchCount = 0;
        const BATCH_SIZE = 500;

        for (const row of data) {
            console.log('Processing member for import:', row);

            const membreRef = window.db.collection('membres').doc();
            const membreData = {
                lifrasID: row.lifrasID || '',
                nom: row.nom || '',
                prenom: row.prenom || '',
                email1: row.email1 || '',
                email2: row.email2 || '',
                telephonePrive: row.telephonePrive || '',
                telephoneBureau: row.telephoneBureau || '',
                adresse: row.adresse || '',
                codePostal: row.codePostal || '',
                localite: row.localite || '',
                pays: row.pays || '',
                dateNaissance: row.dateNaissance || '',
                lieuNaissance: row.lieuNaissance || '',
                langue: row.langue || '',
                nationalite: row.nationalite || '',
                newsletter: row.newsletter || '',
                typeCertif1: row.typeCertif1 || '',
                typeCertif2: row.typeCertif2 || '',
                plongeur: row.plongeur || '',
                apneiste: row.apneiste || '',
                gasBlender: row.gasBlender || '',
                nitrox: row.nitrox || '',
                plongeeSouterraine: row.plongeeSouterraine || '',
                plongeurAdapte: row.plongeurAdapte || '',
                qualificationPPA: row.qualificationPPA || '',
                qualificationVE: row.qualificationVE || '',
                techniqueSubaquatique: row.techniqueSubaquatique || '',
                trimix: row.trimix || '',
                dateDerniereInscription: row.dateDerniereInscription || '',
                validiteCFPS: row.validiteCFPS || '',
                adeps: row.adeps || '',
                plongeeEnfantEncadrant: row.plongeeEnfantEncadrant || '',
                photographe: row.photographe || '',
                archeologue: row.archeologue || '',
                medecin: row.medecin || '',
                derniereModif: firebase.firestore.FieldValue.serverTimestamp(),
                licenceFD: row.licenceFD || '',
                medical: row.medical || ''
            };

            console.log('Member data to be imported:', membreData);

            // Vérifier si un avatar existe pour ce membre
            if (row.lifrasID && existingAvatars.has(row.lifrasID)) {
                membreData.avatar = true;
                console.log('Found avatar for member:', row.lifrasID);
            }

            newBatch.set(membreRef, membreData);
            batchCount++;

            if (batchCount >= BATCH_SIZE) {
                console.log(`Committing batch of ${batchCount} members...`);
                await newBatch.commit();
                console.log(`${count} members imported`);
                batchCount = 0;
            }
            count++;
        }

        if (batchCount > 0) {
            console.log(`Committing final batch of ${batchCount} members...`);
            await newBatch.commit();
        }

        console.log(`Import completed: ${count} members imported`);
        alert(`Importation terminée: ${count} membres importés`);
        await loadMembers();
    } catch (error) {
        console.error('Error during import:', error);
        alert('Erreur lors de l\'importation: ' + error.message);
    }
}

// Fonction pour charger les membres
async function loadMembers() {
    try {
        console.log('Starting loadMembers...');
        const membresTableBody = document.getElementById('membresTableBody');
        const memberCountElement = document.getElementById('memberCount');
        if (!membresTableBody) {
            console.error('Table body element not found');
            return;
        }
        
        membresTableBody.innerHTML = '';

        // Récupérer tous les membres
        console.log('Fetching members from Firestore...');
        const db = window.db; // Gebruik de globale db instantie
        console.log('Using database:', db);
        
        // Controleer of de database correct is geïnitialiseerd
        if (!db) {
            throw new Error('Database not initialized. Please refresh the page and try again.');
        }

        // Haal de leden op en log de ruwe data
        const membersRef = db.collection('membres');
        console.log('Collection reference:', membersRef);
        
        const membersSnapshot = await membersRef.get();
        console.log('Raw members snapshot:', membersSnapshot);
        console.log('Snapshot empty?', membersSnapshot.empty);
        console.log('Snapshot size:', membersSnapshot.size);
        
        // Log alle documenten
        membersSnapshot.forEach(doc => {
            console.log('Document ID:', doc.id);
            console.log('Document data:', doc.data());
        });
        
        if (membersSnapshot.empty) {
            console.log('No members found in database');
            membresTableBody.innerHTML = '<tr><td colspan="5" class="no-members">Aucun membre trouvé</td></tr>';
            if (memberCountElement) {
                memberCountElement.textContent = '0';
            }
            return;
        }

        // Update de teller
        if (memberCountElement) {
            console.log('Updating member count to:', membersSnapshot.size);
            memberCountElement.textContent = membersSnapshot.size;
        } else {
            console.error('Member count element not found');
        }

        // Converteer de Map naar een array
        const members = Array.from(membersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })));
        console.log('Converted to array, length:', members.length);

        // Trier les membres par nom
        members.sort((a, b) => {
            const nameA = `${a.prenom} ${a.nom}`.toLowerCase();
            const nameB = `${b.prenom} ${b.nom}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });

        // Store the members array globally
        currentMembers = members;
        
        console.log('Displaying members in table...');
        // Afficher les membres dans le tableau
        members.forEach(member => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="avatar-cell">
                    <img src="/avatars/default-avatar.svg" alt="Avatar" class="member-table-avatar" data-lifras-id="${member.lifrasID || ''}" loading="lazy">
                </td>
                <td>${member.nom || ''}</td>
                <td>${member.prenom || ''}</td>
                <td>${member.medical || ''}</td>
                <td>
                    <button class="action-button view-member-btn" data-member-id="${member.id}" style="background: #2196F3; margin-right: 5px;">Détails</button>
                    <button class="action-button edit-member-btn" data-member-id="${member.id}" style="background: #4CAF50;">Modifier</button>
                </td>
            `;
            membresTableBody.appendChild(row);
        });
        
        // ⚡ PERFORMANCE: Make avatars and permissions non-blocking
        console.log('⚡ Starting non-blocking avatar and permission loading...');
        
        // Add event listeners for view and edit buttons (immediate)
        document.querySelectorAll('.view-member-btn').forEach(button => {
            button.addEventListener('click', function() {
                const memberId = this.getAttribute('data-member-id');
                viewMemberDetails(memberId);
            });
        });
        
        document.querySelectorAll('.edit-member-btn').forEach(button => {
            button.addEventListener('click', function() {
                const memberId = this.getAttribute('data-member-id');
                editMember(memberId);
            });
        });
        
        // ⚡ Load avatars in background (non-blocking)
        loadMemberAvatarsAsync(members).catch(error => 
            console.warn('Background avatar loading failed:', error)
        );
        
        // ⚡ Apply view and edit permissions in background (non-blocking)
        applyMemberActionPermissions().catch(error => 
            console.warn('Background permissions failed:', error)
        );
        
        console.log('Finished loading members');
    } catch (error) {
        console.error('Erreur lors du chargement des membres:', error);
        console.error('Error details:', error.stack);
        const membresTableBody = document.getElementById('membresTableBody');
        if (membresTableBody) {
            membresTableBody.innerHTML = `<tr><td colspan="5" class="error">Erreur lors du chargement des membres: ${error.message}</td></tr>`;
        }
        // Reset de teller bij een fout
        const memberCountElement = document.getElementById('memberCount');
        if (memberCountElement) {
            memberCountElement.textContent = '0';
        }
    }
}

function filterMembers(searchTerm) {
    if (!searchTerm) {
        // If search is empty, show all members
        const rows = membresTableBody.getElementsByTagName('tr');
        for (let row of rows) {
            row.style.display = '';
        }
        return;
    }

    // Clear the table
    membresTableBody.innerHTML = '';

    // Filter members from the stored array
    const filteredMembers = currentMembers.filter(member => {
        const searchString = `${member.nom} ${member.prenom}`.toLowerCase();
        return searchString.includes(searchTerm.toLowerCase());
    });

    // Display filtered members
    filteredMembers.forEach(member => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="avatar-cell">
                <img src="/avatars/default-avatar.svg" alt="Avatar" class="member-table-avatar" data-lifras-id="${member.lifrasID || ''}" loading="lazy">
            </td>
            <td>${member.nom || ''}</td>
            <td>${member.prenom || ''}</td>
            <td>${member.medical || ''}</td>
            <td>
                <button class="action-button view-member-btn" data-member-id="${member.id}" style="background: #2196F3; margin-right: 5px;">Détails</button>
                <button class="action-button edit-member-btn" data-member-id="${member.id}" style="background: #4CAF50;">Modifier</button>
            </td>
        `;
        membresTableBody.appendChild(row);
    });
    
    // Load avatars asynchronously for filtered members
    loadMemberAvatarsAsync(filteredMembers);
    
    // Add event listeners for view and edit buttons in filtered results
    document.querySelectorAll('.view-member-btn').forEach(button => {
        button.addEventListener('click', function() {
            const memberId = this.getAttribute('data-member-id');
            viewMemberDetails(memberId);
        });
    });
    
    document.querySelectorAll('.edit-member-btn').forEach(button => {
        button.addEventListener('click', function() {
            const memberId = this.getAttribute('data-member-id');
            editMember(memberId);
        });
    });
    
    // Apply view and edit member permissions to filtered results
    applyMemberActionPermissions();
}

async function deleteAllMembers() {
    const batch = window.db.batch();
    const snapshot = await window.db.collection('membres').get();
    snapshot.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
}

function viewMemberDetails(memberId) {
    window.location.href = `/membre-detail.html?id=${memberId}&mode=view`;
}

function editMember(memberId) {
    window.location.href = `/membre-detail.html?id=${memberId}&mode=edit`;
}

// Make functions available globally
window.viewMemberDetails = viewMemberDetails;
window.editMember = editMember;

// ⚡ OPTIMIZED: Batch avatar loading with reduced database queries
async function loadMemberAvatarsAsync(members) {
    try {
        console.log('🖼️ Loading avatars for', members.length, 'members...');
        
        // ⚡ OPTIMIZATION: Get all lifrasIDs that need avatars
        const lifrasIDs = members
            .map(member => member.lifrasID)
            .filter(id => id && id.trim() !== '');
        
        if (lifrasIDs.length === 0) {
            console.log('No lifrasIDs found, using default avatars');
            return;
        }

        // ⚡ OPTIMIZATION: Single batch query instead of individual queries
        console.log('📦 Batch loading avatars for', lifrasIDs.length, 'members...');
        const avatarsSnapshot = await window.db.collection('avatars')
            .where('lifrasID', 'in', lifrasIDs.slice(0, 10)) // Firestore limit: 10 items in 'in' query
            .get();

        // Create a map for fast lookups
        const avatarMap = new Map();
        avatarsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            avatarMap.set(data.lifrasID, data.photoURL);
        });

        // ⚡ Update DOM in batches to avoid blocking
        let processed = 0;
        const updateAvatars = () => {
            const batchSize = 20;
            const endIndex = Math.min(processed + batchSize, members.length);
            
            for (let i = processed; i < endIndex; i++) {
                const member = members[i];
                const avatarImg = document.querySelector(`img[data-lifras-id="${member.lifrasID || ''}"]`);
                if (avatarImg) {
                    const photoURL = avatarMap.get(member.lifrasID) || '/avatars/default-avatar.svg';
                    avatarImg.src = photoURL;
                }
            }
            
            processed = endIndex;
            
            // Continue in next frame if more to process
            if (processed < members.length) {
                requestAnimationFrame(updateAvatars);
            } else {
                console.log('✅ Avatar loading complete');
            }
        };
        
        requestAnimationFrame(updateAvatars);
        
    } catch (error) {
        console.error('❌ Error loading member avatars:', error);
        // Fallback: Set all to default avatars
        members.forEach(member => {
            const avatarImg = document.querySelector(`img[data-lifras-id="${member.lifrasID || ''}"]`);
            if (avatarImg) {
                avatarImg.src = '/avatars/default-avatar.svg';
            }
        });
    }
}

async function updateAllMembersMedical() {
    try {
        console.log('Starting medical field update...');
        const membersSnapshot = await window.db.collection('membres').get();
        let count = 0;
        let batchCount = 0;
        const BATCH_SIZE = 500;
        let currentBatch = window.db.batch();

        for (const doc of membersSnapshot.docs) {
            currentBatch.update(doc.ref, { 
                medical: 'OK',
                derniereModif: firebase.firestore.FieldValue.serverTimestamp()
            });
            batchCount++;
            count++;

            if (batchCount >= BATCH_SIZE) {
                console.log(`Committing batch of ${batchCount} updates...`);
                await currentBatch.commit();
                currentBatch = window.db.batch();
                batchCount = 0;
            }
        }

        if (batchCount > 0) {
            console.log(`Committing final batch of ${batchCount} updates...`);
            await currentBatch.commit();
        }

        console.log(`Update completed: ${count} members updated`);
        alert(`Mise à jour terminée: ${count} membres mis à jour`);
    } catch (error) {
        console.error('Error during update:', error);
        throw error;
    }
}

// Make updateAllMembersMedical available globally
window.updateAllMembersMedical = updateAllMembersMedical;

// ⚡ OPTIMIZED: Fast member permissions initialization
async function initializeMemberPermissions() {
    try {
        console.log('🔒 Initializing member permissions (optimized)...');
        
        // ⚡ OPTIMIZATION: Quick check for member permissions
        if (!window.memberPermissions) {
            console.warn('⚠️ Member permissions not available, using basic fallback');
            // Show UI immediately, permissions will be applied later if available
            return;
        }

        // ⚡ OPTIMIZATION: Don't wait for full initialization
        const initPromise = window.memberPermissions.initialize();
        
        // ⚡ Apply basic permissions immediately (non-blocking)
        applyMemberPermissions().catch(error => {
            console.warn('⚠️ Initial permission application failed:', error);
        });
        
        // Wait for full initialization in background
        await initPromise;
        
        console.log('✅ Member permissions fully initialized');
        
    } catch (error) {
        console.warn('⚠️ Member permissions failed, using fallback:', error);
        // Don't disable actions - let users try and handle errors gracefully
    }
}

// ⚡ OPTIMIZED: Fast permission checks with graceful fallbacks
async function applyMemberPermissions() {
    try {
        console.log('🔐 Applying member permissions (optimized)...');
        
        // ⚡ OPTIMIZATION: Show UI immediately, check permissions in background
        const importBtn = document.getElementById('importExcelBtn');
        const deleteAllBtn = document.getElementById('deleteAllBtn');
        const updateMedicalBtn = document.getElementById('updateMedicalBtn');

        // ⚡ Show buttons immediately (better UX)
        [importBtn, deleteAllBtn, updateMedicalBtn].forEach(btn => {
            if (btn) {
                btn.style.display = '';
                btn.disabled = false;
            }
        });

        // ⚡ OPTIMIZATION: Check permissions in parallel with timeout
        const permissionTimeout = 2000; // 2 second timeout
        const permissionPromises = [
            Promise.race([canImportMembers(), new Promise(resolve => setTimeout(() => resolve(true), permissionTimeout))]),
            Promise.race([canDeleteMembers(), new Promise(resolve => setTimeout(() => resolve(true), permissionTimeout))]),
            Promise.race([canModifyMembers(), new Promise(resolve => setTimeout(() => resolve(true), permissionTimeout))])
        ];

        const [canImport, canDelete, canModify] = await Promise.all(permissionPromises);
        
        console.log('📋 Member permissions (with timeout):', {
            canImport,
            canDelete,
            canModify
        });

        // ⚡ Apply permissions only if explicitly denied
        if (!canImport && importBtn) {
            importBtn.style.display = 'none';
            importBtn.disabled = true;
            console.log('🚫 Import Excel button hidden - no permission');
        }

        if (!canDelete && deleteAllBtn) {
            deleteAllBtn.style.display = 'none';
            deleteAllBtn.disabled = true;
            console.log('🚫 Delete All button hidden - no permission');
        }

        if (!canModify && updateMedicalBtn) {
            updateMedicalBtn.style.display = 'none';
            updateMedicalBtn.disabled = true;
            console.log('🚫 Update Medical button hidden - no permission');
        }

        // Store permissions for later use
        window.memberUIPermissions = {
            canImport,
            canDelete,
            canModify
        };

        console.log('✅ Member permissions applied successfully');

    } catch (error) {
        console.warn('⚠️ Error applying member permissions, using permissive fallback:', error);
        // ⚡ OPTIMIZATION: Don't disable everything on error - show warning instead
        const permissionWarning = document.createElement('div');
        permissionWarning.style.cssText = 'background: #fff3cd; color: #856404; padding: 8px; margin: 10px 0; border-radius: 4px; font-size: 14px;';
        permissionWarning.textContent = '⚠️ Permissions check failed - some actions may be restricted';
        document.querySelector('.container')?.prepend(permissionWarning);
    }
}

// Disable all member management actions
function disableAllMemberActions() {
    console.log('🚫 Disabling all member management actions');
    
    const buttons = [
        'importExcelBtn',
        'deleteAllBtn', 
        'updateMedicalBtn'
    ];

    buttons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = true;
            button.style.display = 'none';
        }
    });
}

// Check permissions for view member details action
async function canViewMember() {
    try {
        console.log('🔧 [DEBUG] canViewMember() - calling canViewMemberDetails()...');
        const result = await canViewMemberDetails();
        console.log('🔧 [DEBUG] canViewMember() - result:', result);
        return result;
    } catch (error) {
        console.error('❌ [DEBUG] Error checking view member permission:', error);
        return false;
    }
}

// Check permissions for edit member action
async function canEditMember() {
    try {
        console.log('🔧 [DEBUG] canEditMember() - calling canModifyMembers()...');
        const result = await canModifyMembers();
        console.log('🔧 [DEBUG] canEditMember() - result:', result);
        return result;
    } catch (error) {
        console.error('❌ [DEBUG] Error checking edit member permission:', error);
        return false;
    }
}

// ⚡ OPTIMIZED: Fast view and edit permissions with timeout
async function applyMemberActionPermissions() {
    try {
        console.log('🔧 [DEBUG] Starting applyMemberActionPermissions...');
        
        // ⚡ Hide all buttons initially for secure default
        const viewButtons = document.querySelectorAll('.view-member-btn');
        const editButtons = document.querySelectorAll('.edit-member-btn');
        
        console.log(`🔧 [DEBUG] Found ${viewButtons.length} view buttons and ${editButtons.length} edit buttons`);
        
        [...viewButtons, ...editButtons].forEach(button => {
            button.style.display = 'none';
            button.disabled = true;
        });
        
        console.log('🔧 [DEBUG] Buttons hidden, now checking permissions...');

        // ⚡ Await permission checks without timeout for accuracy
        console.log('🔧 [DEBUG] Calling canViewMember()...');
        const canView = await canViewMember();
        
        console.log('🔧 [DEBUG] Calling canEditMember()...');
        const canEdit = await canEditMember();
        
        console.log('📋 [DEBUG] Member action permissions result:', { canView, canEdit });
        
        // ⚡ Show buttons only if permitted
        if (canView) {
            viewButtons.forEach(button => {
                button.style.display = '';
                button.disabled = false;
            });
            console.log('✅ [DEBUG] View member buttons VISIBLE - permission granted');
        } else {
            console.log('🚫 [DEBUG] View member buttons HIDDEN - no permission');
        }
        
        if (canEdit) {
            editButtons.forEach(button => {
                button.style.display = '';
                button.disabled = false;
            });
            console.log('✅ [DEBUG] Edit member buttons VISIBLE - permission granted');
        } else {
            console.log('🚫 [DEBUG] Edit member buttons HIDDEN - no permission');
        }
        
        console.log('🔧 [DEBUG] applyMemberActionPermissions completed successfully');
        
    } catch (error) {
        console.error('❌ [DEBUG] Member action permissions check failed:', error);
        console.warn('⚠️ Member action permissions check failed, keeping buttons hidden for security');
        // ⚡ On error, keep buttons hidden (secure fallback)
    }
}

// Debug function for testing membre page permissions
window.debugMembresPermissions = async function() {
    console.log('🔧 [DEBUG] === MEMBRES PAGE PERMISSIONS DEBUG ===');
    
    try {
        // Check button elements
        const viewButtons = document.querySelectorAll('.view-member-btn');
        const editButtons = document.querySelectorAll('.edit-member-btn');
        
        console.log(`🔧 [DEBUG] Found ${viewButtons.length} view buttons and ${editButtons.length} edit buttons`);
        
        viewButtons.forEach((btn, index) => {
            console.log(`🔧 [DEBUG] View button ${index}: display=${btn.style.display}, disabled=${btn.disabled}`);
        });
        
        editButtons.forEach((btn, index) => {
            console.log(`🔧 [DEBUG] Edit button ${index}: display=${btn.style.display}, disabled=${btn.disabled}`);
        });
        
        // Test permission functions
        console.log('🔧 [DEBUG] Testing permission functions...');
        
        const canView = await canViewMember();
        const canEdit = await canEditMember();
        
        console.log(`🔧 [DEBUG] Permission results: canView=${canView}, canEdit=${canEdit}`);
        
        // Test direct permission calls
        const directView = await canViewMemberDetails();
        const directEdit = await canModifyMembers();
        
        console.log(`🔧 [DEBUG] Direct permission results: canViewMemberDetails=${directView}, canModifyMembers=${directEdit}`);
        
        // Re-apply permissions
        console.log('🔧 [DEBUG] Re-applying permissions...');
        await applyMemberActionPermissions();
        
    } catch (error) {
        console.error('❌ [DEBUG] Debug failed:', error);
    }
    
    console.log('🔧 [DEBUG] === END MEMBRES DEBUG ===');
}; 