const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialiser Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function initializeCollections() {
  try {
    console.log('Initialisation des collections Firestore...');

    // Créer le document de santé
    const healthRef = db.collection('_health').doc('check');
    await healthRef.set({
      status: 'ok',
      lastChecked: admin.firestore.FieldValue.serverTimestamp(),
      environment: 'production'
    });
    console.log('Document _health créé avec succès');

    // Créer un membre de test
    const testMember = {
      lifrasID: 'TEST001',
      nrFebras: 'FEB001',
      nom: 'Dupont',
      prenom: 'Jean',
      dateNaissance: '1990-01-01',
      lieuNaissance: 'Bruxelles',
      nationalite: 'Belge',
      adresse: 'Rue de la Paix 1',
      codePostal: '1000',
      localite: 'Bruxelles',
      pays: 'Belgique',
      email1: 'jean.dupont@example.com',
      dateDerniereInscription: '2024-01-01',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const memberRef = await db.collection('membres').add(testMember);
    console.log('Membre de test créé avec succès:', memberRef.id);

    console.log('Initialisation terminée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
  } finally {
    process.exit();
  }
}

initializeCollections(); 