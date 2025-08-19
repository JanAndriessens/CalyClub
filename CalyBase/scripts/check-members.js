import admin from 'firebase-admin';
import serviceAccount from '../serviceAccountKey.json' assert { type: 'json' };

// Initialiser Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkMembers() {
  try {
    console.log('Vérification des membres dans la base de données...');

    // Compter les membres
    const membersSnapshot = await db.collection('membres').get();
    console.log(`Nombre total de membres: ${membersSnapshot.size}`);

    if (membersSnapshot.size > 0) {
      console.log('\nPremiers 5 membres:');
      let count = 0;
      membersSnapshot.forEach(doc => {
        if (count < 5) {
          const data = doc.data();
          console.log(`- ${data.prenom} ${data.nom} (LifrasID: ${data.lifrasID})`);
          count++;
        }
      });
    } else {
      console.log('Aucun membre trouvé dans la base de données.');
    }

    // Vérifier la collection avatars
    const avatarsSnapshot = await db.collection('avatars').get();
    console.log(`\nNombre d'avatars: ${avatarsSnapshot.size}`);

  } catch (error) {
    console.error('Erreur lors de la vérification:', error);
  } finally {
    process.exit();
  }
}

checkMembers(); 