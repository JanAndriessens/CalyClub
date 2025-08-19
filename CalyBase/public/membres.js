// DOM Elements
const membresTableBody = document.getElementById('membresTableBody');
const searchInput = document.getElementById('searchInput');
const importExcelBtn = document.getElementById('importExcelBtn');
const excelFileInput = document.getElementById('excelFileInput');
const deleteAllBtn = document.getElementById('deleteAllBtn');
const updateMedicalBtn = document.getElementById('updateMedicalBtn');
const whoIsWhoBtn = document.getElementById('whoIsWhoBtn');

// Add this variable at the top of the file with other DOM elements
let currentMembers = [];

// Create module-specific logger
const logger = new Logger('Membres');

// Fonction centralisée pour calculer le statut médical
function calculateMedicalStatus(validiteCertificatMedical) {
    // Si pas de date de validité, statut inconnu
    if (!validiteCertificatMedical || validiteCertificatMedical.trim() === '') {
        return 'INCONNU';
    }
    
    try {
        // Créer les dates pour comparaison
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Réinitialiser à minuit pour comparaison de dates seulement
        
        const validityDate = new Date(validiteCertificatMedical);
        validityDate.setHours(23, 59, 59, 999); // Fin de journée pour la date de validité
        
        // Vérifier si la date est valide
        if (isNaN(validityDate.getTime())) {
            return 'INCONNU';
        }
        
        // Comparer les dates
        return validityDate >= today ? 'OK' : 'PAS OK';
        
    } catch (error) {
        console.error('Erreur lors du calcul du statut médical:', error);
        return 'INCONNU';
    }
}

// Rendre la fonction disponible globalement pour autres modules
window.calculateMedicalStatus = calculateMedicalStatus;

// Fonction de test pour vérifier le calcul du statut médical
function testMedicalStatusCalculation() {
    console.log('🧪 Test du calcul du statut médical:');
    
    // Test avec date future (valide)
    const futureDate = '2026-12-31';
    console.log(`Date future (${futureDate}):`, calculateMedicalStatus(futureDate));
    
    // Test avec date passée (expirée)
    const pastDate = '2023-01-15';
    console.log(`Date passée (${pastDate}):`, calculateMedicalStatus(pastDate));
    
    // Test avec date aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    console.log(`Date aujourd'hui (${today}):`, calculateMedicalStatus(today));
    
    // Test avec date vide
    console.log('Date vide (""):', calculateMedicalStatus(''));
    
    // Test avec date null
    console.log('Date null:', calculateMedicalStatus(null));
    
    // Test avec date invalide
    console.log('Date invalide ("abc"):', calculateMedicalStatus('abc'));
    
    console.log('✅ Tests terminés');
}

// Rendre la fonction de test disponible globalement
window.testMedicalStatusCalculation = testMedicalStatusCalculation;

// Fonction de diagnostic pour vérifier les données des membres
function debugMemberData() {
    console.log('🔍 Diagnostic des données membres:');
    
    if (currentMembers && currentMembers.length > 0) {
        console.log(`Nombre de membres chargés: ${currentMembers.length}`);
        
        // Analyser les premiers membres
        currentMembers.slice(0, 3).forEach((member, index) => {
            console.log(`\n--- Membre ${index + 1} ---`);
            console.log('ID:', member.id);
            console.log('Nom:', `"${member.nom}"`);
            console.log('Prénom:', `"${member.prenom}"`);
            console.log('Email1:', `"${member.email1}"`);
            console.log('ValiditéCertifMed:', `"${member.validiteCertificatMedical}"`);
            console.log('Medical calculé:', calculateMedicalStatus(member.validiteCertificatMedical));
            
            // Afficher toutes les clés pour déboguer
            console.log('Toutes les clés:', Object.keys(member));
        });
    } else {
        console.log('❌ Aucun membre chargé dans currentMembers');
    }
}

// Rendre la fonction disponible globalement
window.debugMemberData = debugMemberData;

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

    // Setup event listeners (removed duplicate Excel listeners - they are added separately below)

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

// Parse CSV data into JSON format for processing
function parseCSVData(csvString) {
    console.log('Starting CSV parsing...');
    
    if (!csvString || typeof csvString !== 'string') {
        console.error('Invalid CSV data');
        return [];
    }
    
    // Split into lines and filter out empty lines
    const lines = csvString.split('\n').filter(line => line.trim().length > 0);
    console.log('CSV lines found:', lines.length);
    
    if (lines.length === 0) {
        console.error('No data lines found in CSV');
        return [];
    }
    
    // Parse each line into fields using tab separator
    const jsonData = lines.map((line, index) => {
        // Split by tab and clean each field
        const fields = line.split('\t').map(field => {
            // Clean each field while preserving French accents
            let cleaned = field.trim()
                // Remove HTML tags and artifacts
                .replace(/<\/?[^>]+(>|$)/g, '')
                .replace(/&[a-zA-Z0-9#]+;/g, '')
                .replace(/\/?td>/g, '')
                .replace(/\/?tr>/g, '')
                .replace(/\/?table>/g, '')
                // Remove problematic encoding artifacts but preserve French characters
                .replace(/[\u4e00-\u9fff]/g, '')
                .replace(/[\u3400-\u4dbf]/g, '')
                .replace(/[\uf900-\ufaff]/g, '')
                // Remove control characters but preserve French accents (Latin-1 Supplement U+0080-U+00FF)
                .replace(/[\x00-\x1F\x7F]/g, '')
                // Normalize whitespace
                .replace(/\s+/g, ' ')
                .trim();
            
            return cleaned;
        });
        
        console.log(`Parsed CSV row ${index}:`, fields);
        return fields;
    });
    
    console.log('CSV parsing complete');
    return jsonData;
}

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
                
                // XLSX-optimized options for reliable French character support AND date handling
                const workbook = XLSX.read(data, { 
                    type: 'array',
                    codepage: 65001,  // UTF-8 for XLSX files (better than Windows-1252 for modern format)
                    cellDates: true,  // Parse dates as Date objects
                    cellNF: false,    // Don't include number formats
                    cellText: false,  // Don't use formatted text - this can break dates!
                    WTF: false,       // Don't write through formatting errors
                    raw: false,       // Use formatted values, not raw values
                    cellFormula: false,
                    cellHTML: false,  // Don't parse HTML content
                    dense: false,     // Use standard format for better parsing
                    UTC: false        // Use local timezone for dates
                });

                console.log('Workbook sheets:', workbook.SheetNames);
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                
                // Convert Excel to CSV format for more reliable parsing
                // Convert Excel to JSON format to preserve date objects AND handle date strings
                console.log('Converting Excel to JSON format to preserve dates...');
                const jsonRawData = XLSX.utils.sheet_to_json(firstSheet, { 
                    header: 1,        // Use first row as headers
                    defval: '',       // Default value for empty cells
                    blankrows: false, // Skip blank rows
                    dateNF: 'yyyy-mm-dd'  // Date format
                });
                
                console.log('JSON conversion complete. Sample data:', jsonRawData.slice(0, 3));
                
                // Convert back to CSV-like format but with proper date handling
                const csvData = jsonRawData.map(row => {
                    return row.map(cell => {
                        // Handle Date objects properly
                        if (cell instanceof Date) {
                            // Format date as YYYY-MM-DD
                            const year = cell.getFullYear();
                            const month = String(cell.getMonth() + 1).padStart(2, '0');
                            const day = String(cell.getDate()).padStart(2, '0');
                            return `${year}-${month}-${day}`;
                        }
                        
                        // Handle date strings in dd/mm/yyyy format
                        if (typeof cell === 'string' && cell.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                            const parts = cell.split('/');
                            if (parts.length === 3) {
                                const day = parts[0];
                                const month = parts[1];
                                const year = parts[2];
                                // Convert dd/mm/yyyy to yyyy-mm-dd
                                return `${year}-${month}-${day}`;
                            }
                        }
                        
                        return String(cell || '');
                    }).join('\t');
                }).join('\n');

                console.log('CSV conversion complete. First 500 characters:', csvData.substring(0, 500));
                
                // Parse CSV data into structured format
                const jsonData = parseCSVData(csvData);

                console.log('Parsed CSV data:', jsonData);
                console.log('Number of rows:', jsonData.length);
                console.log('CSV headers:', jsonData[0]); // Debug: show headers
                console.log('First few rows for debugging:');
                for (let i = 1; i <= Math.min(3, jsonData.length - 1); i++) {
                    console.log(`Row ${i}:`, jsonData[i]);
                    console.log(`Row ${i} cell count:`, jsonData[i] ? jsonData[i].length : 0);
                }

                // Store data for processing - do not call continueExcelImport from here
                window.tempExcelData = jsonData;
                resolve();

            } catch (error) {
                console.error('Error processing Excel file:', error);
                reject(error);
            }
        };


        // Don't auto-resolve anymore - wait for user confirmation
        // resolve(processedData) is removed

        reader.onerror = function(error) {
            console.error('Error reading file:', error);
            reject(error);
        };

        reader.readAsArrayBuffer(file);
    });
}

// Excel import continuation function - moved to global scope
window.continueExcelImport = async function() {
    try {
        const jsonData = window.tempExcelData;
        if (!jsonData) {
            alert('Excel data lost. Please try importing again.');
            return;
        }

        // Remove loading message before processing
        const loadingMsg = document.getElementById('loading-message');
        if (loadingMsg) loadingMsg.remove();

        // Create header mapping - map Excel headers to column indices
        const headers = jsonData[0] || [];
        console.log('Creating header mapping from:', headers);
        
        // Function to find column index by header name (case-insensitive, flexible matching)
        const findColumnIndex = (headerName) => {
            return headers.findIndex(h => 
                String(h || '').toLowerCase().trim() === headerName.toLowerCase().trim()
            );
        };
        
        // Create mapping of field names to column indices
        const columnMapping = {
            lifrasID: findColumnIndex('LifrasID'),
            nrFebras: findColumnIndex('Nr.Febras'),
            nom: findColumnIndex('Nom'),
            prenom: findColumnIndex('Prenom'),
            adresse: findColumnIndex('Adresse'),
            codePostal: findColumnIndex('Code postal'),
            localite: findColumnIndex('Localité'),
            email1: findColumnIndex('Email 1'),
            email2: findColumnIndex('Email 2'),
            email3: findColumnIndex('Email 3'),
            telephonePrive: findColumnIndex('Téléphone privé'),
            telephoneBureau: findColumnIndex('Téléphone bureau'),
            gsm1: findColumnIndex('GSM 1'),
            gsm2: findColumnIndex('GSM 2'),
            gsm3: findColumnIndex('GSM 3'),
            dateCertificatMedical: findColumnIndex('Date du certificat médical'),
            validiteCertificatMedical: findColumnIndex('Validité du certificat médical'),
            dateECG: findColumnIndex('Date du E.C.G.'),
            validiteECG: findColumnIndex('Validité du E.C.G.'),
            ice: findColumnIndex('ICE'),
            description: findColumnIndex('Description'),
            pays: findColumnIndex('Pays'),
            dateNaissance: findColumnIndex('Date de naissance'),
            lieuNaissance: findColumnIndex('Lieu de naissance'),
            langue: findColumnIndex('Langue'),
            nationalite: findColumnIndex('Nationalité'),
            newsletter: findColumnIndex('Newsletter'),
            typeCertif1: findColumnIndex('Type de certif.1'),
            typeCertif2: findColumnIndex('Type de certif.2'),
            plongeur: findColumnIndex('Plongeur'),
            apneiste: findColumnIndex('Apnéiste'),
            gasBlender: findColumnIndex('Gas Blender'),
            nitrox: findColumnIndex('Nitrox'),
            plongeeSouterraine: findColumnIndex('Plongée Souterraine'),
            plongeurAdapte: findColumnIndex('Plongeur Adapté'),
            qualificationPPA: findColumnIndex('Qualification PPA'),
            qualificationVE: findColumnIndex('Qualification VE'),
            techniqueSubaquatique: findColumnIndex('Technique Subaquatique'),
            trimix: findColumnIndex('Trimix'),
            dateDerniereInscription: findColumnIndex('Date dernière inscription'),
            validiteCFPS: findColumnIndex('Validité CFPS'),
            adeps: findColumnIndex('ADEPS'),
            plongeeEnfantEncadrant: findColumnIndex('Plongée enfant encadrant'),
            photographe: findColumnIndex('Photographe'),
            archeologue: findColumnIndex('Archéologue'),
            medecin: findColumnIndex('Médecin'),
            derniereModif: findColumnIndex('Dernière modif'),
            licenceFD: findColumnIndex('Licence FD')
        };
        
        console.log('Column mapping created:', columnMapping);

        // Process the data, starting from row 1 (skip headers)
        const processedData = jsonData.slice(1).map((row, index) => {
            console.log(`Processing row ${index + 1}:`, row);
            
            if (!row || !row[columnMapping.lifrasID]) {
                console.log(`Skipping empty row ${index + 1} (no LifrasID)`);
                return null;
            }

            // Function to get cell value by column index (CSV data is already cleaned)
            const getCleanValue = (colIndex) => {
                if (colIndex === -1 || !row[colIndex]) return '';
                
                const cell = row[colIndex];
                if (cell === undefined || cell === null) return '';
                
                // CSV data is already cleaned, just return as string
                return String(cell).trim();
            };

            // Special function to extract first name from corrupted data
            const extractFirstName = (colIndex) => {
                const fullValue = getCleanValue(colIndex);
                if (!fullValue) return '';
                
                // If the value contains address-like patterns, extract only the first part (likely the name)
                const addressPatterns = /\b\d{4}\b|\bWavre\b|\bBruxelles\b|\bLiège\b|\bChaussée\b|\bChainia\b|\bMartyrs\b|\bRue\b|\bAvenue\b|\bBoulevard\b|\bdu\b|\bde\b|\bdes\b/i;
                
                if (addressPatterns.test(fullValue)) {
                    // Split on common separators and take the first meaningful part
                    const parts = fullValue.split(/[\s\-_]+/);
                    for (let part of parts) {
                        // Return first part that looks like a name (alphabetic, reasonable length)
                        if (part.length >= 2 && part.length <= 20 && /^[A-Za-zÀ-ÿ]+$/.test(part)) {
                            return part;
                        }
                    }
                    // If no clean name found, return first part
                    return parts[0] || '';
                }
                
                return fullValue;
            };

            // Create object using header-based mapping
            const processedRow = {
                lifrasID: getCleanValue(columnMapping.lifrasID),
                nrFebras: getCleanValue(columnMapping.nrFebras),
                nom: getCleanValue(columnMapping.nom),
                prenom: getCleanValue(columnMapping.prenom),
                adresse: getCleanValue(columnMapping.adresse),
                codePostal: getCleanValue(columnMapping.codePostal),
                localite: getCleanValue(columnMapping.localite),
                email1: getCleanValue(columnMapping.email1),
                email2: getCleanValue(columnMapping.email2),
                email3: getCleanValue(columnMapping.email3),
                telephonePrive: getCleanValue(columnMapping.telephonePrive),
                telephoneBureau: getCleanValue(columnMapping.telephoneBureau),
                gsm1: getCleanValue(columnMapping.gsm1),
                gsm2: getCleanValue(columnMapping.gsm2),
                gsm3: getCleanValue(columnMapping.gsm3),
                dateCertificatMedical: getCleanValue(columnMapping.dateCertificatMedical),
                validiteCertificatMedical: getCleanValue(columnMapping.validiteCertificatMedical),
                dateECG: getCleanValue(columnMapping.dateECG),
                validiteECG: getCleanValue(columnMapping.validiteECG),
                ice: getCleanValue(columnMapping.ice),
                description: getCleanValue(columnMapping.description),
                pays: getCleanValue(columnMapping.pays),
                dateNaissance: getCleanValue(columnMapping.dateNaissance),
                lieuNaissance: getCleanValue(columnMapping.lieuNaissance),
                langue: getCleanValue(columnMapping.langue),
                nationalite: getCleanValue(columnMapping.nationalite),
                newsletter: getCleanValue(columnMapping.newsletter),
                typeCertif1: getCleanValue(columnMapping.typeCertif1),
                typeCertif2: getCleanValue(columnMapping.typeCertif2),
                plongeur: getCleanValue(columnMapping.plongeur),
                apneiste: getCleanValue(columnMapping.apneiste),
                gasBlender: getCleanValue(columnMapping.gasBlender),
                nitrox: getCleanValue(columnMapping.nitrox),
                plongeeSouterraine: getCleanValue(columnMapping.plongeeSouterraine),
                plongeurAdapte: getCleanValue(columnMapping.plongeurAdapte),
                qualificationPPA: getCleanValue(columnMapping.qualificationPPA),
                qualificationVE: getCleanValue(columnMapping.qualificationVE),
                techniqueSubaquatique: getCleanValue(columnMapping.techniqueSubaquatique),
                trimix: getCleanValue(columnMapping.trimix),
                dateDerniereInscription: getCleanValue(columnMapping.dateDerniereInscription),
                validiteCFPS: getCleanValue(columnMapping.validiteCFPS),
                adeps: getCleanValue(columnMapping.adeps),
                plongeeEnfantEncadrant: getCleanValue(columnMapping.plongeeEnfantEncadrant),
                photographe: getCleanValue(columnMapping.photographe),
                archeologue: getCleanValue(columnMapping.archeologue),
                medecin: getCleanValue(columnMapping.medecin),
                derniereModif: getCleanValue(columnMapping.derniereModif),
                licenceFD: getCleanValue(columnMapping.licenceFD)
            };

            console.log('Processed row:', processedRow);
            return processedRow;
        }).filter(row => row !== null);

        console.log('Final processed data:', processedData);
        console.log('Number of processed rows:', processedData.length);
        
        if (processedData.length === 0) {
            console.error('No data was processed from the Excel file');
            alert('No data was processed from the Excel file');
            return;
        }

        // Import the data
        console.log('Proceeding with import...');
        await importMembres(processedData);
        await loadMembers(); // Refresh the display
        alert(`✅ Import successful! ${processedData.length} members imported.`);
        
    } catch (error) {
        console.error('Error processing Excel file:', error);
        alert('Error processing Excel file: ' + error.message);
        
        // Clean up loading message on error
        const loadingMsg = document.getElementById('loading-message');
        if (loadingMsg) loadingMsg.remove();
    }
};

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
                nrFebras: row.nrFebras || '',
                nom: row.nom || '',
                prenom: row.prenom || '',
                email1: row.email1 || '',
                email2: row.email2 || '',
                email3: row.email3 || '',
                telephonePrive: row.telephonePrive || '',
                telephoneBureau: row.telephoneBureau || '',
                gsm1: row.gsm1 || '',
                gsm2: row.gsm2 || '',
                gsm3: row.gsm3 || '',
                adresse: row.adresse || '',
                codePostal: row.codePostal || '',
                localite: row.localite || '',
                pays: row.pays || '',
                dateNaissance: row.dateNaissance || '',
                lieuNaissance: row.lieuNaissance || '',
                dateCertificatMedical: row.dateCertificatMedical || '',
                validiteCertificatMedical: row.validiteCertificatMedical || '',
                dateECG: row.dateECG || '',
                validiteECG: row.validiteECG || '',
                ice: row.ice || '',
                langue: row.langue || '',
                nationalite: row.nationalite || '',
                newsletter: row.newsletter || '',
                description: row.description || '',
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
                medical: calculateMedicalStatus(row.validiteCertificatMedical)
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
                <td>${calculateMedicalStatus(member.validiteCertificatMedical)}</td>
                <td>
                    <button class="action-button view-member-btn" data-member-id="${member.id}" style="background: #2196F3;">Détails</button>
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
        
        // ⚡ Load avatars immediately (blocking to ensure they show on initial load)
        try {
            await loadMemberAvatarsAsync(members);
            console.log('✅ Initial avatar loading completed');
        } catch (error) {
            console.warn('⚠️ Initial avatar loading failed:', error);
        }
        
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
            <td>${calculateMedicalStatus(member.validiteCertificatMedical)}</td>
            <td>
                <button class="action-button view-member-btn" data-member-id="${member.id}" style="background: #2196F3;">Détails</button>
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

// Make functions available globally
window.viewMemberDetails = viewMemberDetails;

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

        // ⚡ OPTIMIZATION: Handle Firestore 'in' query limit by batching
        console.log('📦 Batch loading avatars for', lifrasIDs.length, 'members...');
        const avatarMap = new Map();
        
        // Process in batches of 10 (Firestore 'in' query limit)
        const batchSize = 10;
        for (let i = 0; i < lifrasIDs.length; i += batchSize) {
            const batch = lifrasIDs.slice(i, i + batchSize);
            console.log(`📦 Loading avatar batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(lifrasIDs.length/batchSize)} (${batch.length} items)`);
            
            const avatarsSnapshot = await window.db.collection('avatars')
                .where('lifrasID', 'in', batch)
                .get();
                
            avatarsSnapshot.docs.forEach(doc => {
                const data = doc.data();
                avatarMap.set(data.lifrasID, data.photoURL);
            });
        }

        // ⚡ Update DOM in batches to avoid blocking
        let processed = 0;
        const updateAvatars = () => {
            const batchSize = 5; // Smaller batches for robust avatar loading
            const endIndex = Math.min(processed + batchSize, members.length);
            
            for (let i = processed; i < endIndex; i++) {
                const member = members[i];
                const avatarImg = document.querySelector(`img[data-lifras-id="${member.lifrasID || ''}"]`);
                if (avatarImg) {
                    const primaryUrl = avatarMap.get(member.lifrasID);
                    
                    // Use robust avatar system if available
                    if (window.AvatarUtils) {
                        window.AvatarUtils.setupRobustAvatar(avatarImg, primaryUrl, member.lifrasID, {
                            showLoading: false,
                            onSuccess: (finalUrl) => {
                                // Reduced logging to avoid spam
                                if (Math.random() < 0.1) console.log(`✅ Table avatar sample: ${member.lifrasID}`);
                            },
                            onFallback: () => {
                                console.log(`🔄 Table avatar fallback: ${member.lifrasID}`);
                            }
                        });
                    } else {
                        // Basic fallback if AvatarUtils not available
                        const photoURL = primaryUrl || '/avatars/default-avatar.svg';
                        avatarImg.src = photoURL;
                    }
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
        // Fallback: Set all to default avatars using robust system
        members.forEach(member => {
            const avatarImg = document.querySelector(`img[data-lifras-id="${member.lifrasID || ''}"]`);
            if (avatarImg) {
                if (window.AvatarUtils) {
                    window.AvatarUtils.setupRobustAvatar(avatarImg, null, member.lifrasID, {
                        showLoading: false
                    });
                } else {
                    avatarImg.src = '/avatars/default-avatar.svg';
                }
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
            const memberData = doc.data();
            const calculatedMedicalStatus = calculateMedicalStatus(memberData.validiteCertificatMedical);
            
            currentBatch.update(doc.ref, { 
                medical: calculatedMedicalStatus,
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
        
        const viewButtons = document.querySelectorAll('.view-member-btn');
        
        console.log(`🔧 [DEBUG] Found ${viewButtons.length} view buttons`);
        
        // ⚡ Details (view) buttons are ALWAYS visible - no permission check needed
        viewButtons.forEach(button => {
            button.style.display = '';
            button.disabled = false;
        });
        console.log('✅ [DEBUG] View member buttons ALWAYS VISIBLE - no permission check required');
        
        console.log('✅ [DEBUG] Member action permissions applied - only view buttons available');
        
        console.log('🔧 [DEBUG] applyMemberActionPermissions completed successfully');
        
    } catch (error) {
        console.error('❌ [DEBUG] Member action permissions check failed:', error);
        console.warn('⚠️ Member action permissions check failed, keeping view buttons visible for security');
        
        // ⚡ On error, ensure view buttons remain visible
        const viewButtons = document.querySelectorAll('.view-member-btn');
        
        viewButtons.forEach(button => {
            button.style.display = '';
            button.disabled = false;
        });
    }
}

// Excel Import Functionality with HTML Tag Cleaning
// Note: DOM elements already declared at top of file (importExcelBtn, excelFileInput)

// Add Who is who event listener
if (whoIsWhoBtn) {
    whoIsWhoBtn.addEventListener('click', () => {
        window.location.href = '/who-is-who.html';
    });
}

// Add Excel import event listeners
if (importExcelBtn && excelFileInput) {
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

        // Check file extension - only XLSX accepted
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        if (fileExtension === 'xls') {
            alert(`⚠️ Format de fichier non supporté

Seuls les fichiers XLSX sont acceptés pour garantir une importation fiable.

Pour convertir votre fichier XLS en XLSX :
1. Ouvrez votre fichier dans Excel
2. Cliquez sur 'Fichier' → 'Enregistrer sous'
3. Dans 'Type de fichier', choisissez 'Classeur Excel (.xlsx)'
4. Enregistrez et réessayez l'importation

Cette conversion préserve mieux les caractères français (é, à, ç).`);
            return;
        }
        
        if (fileExtension !== 'xlsx') {
            alert('Seuls les fichiers XLSX sont autorisés');
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

            // First parse the Excel file
            await readExcelFile(file);
            
            // Then process and import the data
            await window.continueExcelImport();
            
        } catch (error) {
            console.error('Erreur lors de l\'importation:', error);
            alert('Erreur lors de l\'importation: ' + error.message);
            
            // Remove loading message on error
            const msg = document.getElementById('loading-message');
            if (msg) msg.remove();
        }
        
        // Clear the file input
        e.target.value = '';
    });
}



// Enhanced text cleaning function to handle HTML tags and encoding issues
function cleanExcelText(text) {
    if (!text) return '';
    
    let cleaned = String(text);
    
    // Remove HTML tags (like <td>, </td>) - more comprehensive
    cleaned = cleaned.replace(/<\/?[^>]+(>|$)/g, '');
    
    // Remove HTML entities like &nbsp; &eacute; etc.
    cleaned = cleaned.replace(/&[a-zA-Z0-9#]+;/g, '');
    
    // Remove Chinese/UTF-8 encoding artifacts (like 饼, 饠, 顼)
    cleaned = cleaned.replace(/[\u4e00-\u9fff]/g, '');
    cleaned = cleaned.replace(/[\u3400-\u4dbf]/g, '');
    cleaned = cleaned.replace(/[\uf900-\ufaff]/g, '');
    
    // Remove control characters but preserve French accents
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Remove /td> artifacts and similar patterns
    cleaned = cleaned.replace(/\/?td>/g, '');
    cleaned = cleaned.replace(/\/?tr>/g, '');
    cleaned = cleaned.replace(/\/?table>/g, '');
    
    // Normalize multiple spaces/tabs to single space
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    return cleaned.trim();
}



// Debug function for testing membre page permissions
window.debugMembresPermissions = async function() {
    console.log('🔧 [DEBUG] === MEMBRES PAGE PERMISSIONS DEBUG ===');
    
    try {
        // Check button elements
        const viewButtons = document.querySelectorAll('.view-member-btn');
        
        console.log(`🔧 [DEBUG] Found ${viewButtons.length} view buttons`);
        
        viewButtons.forEach((btn, index) => {
            console.log(`🔧 [DEBUG] View button ${index}: display=${btn.style.display}, disabled=${btn.disabled}`);
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