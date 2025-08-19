import { db } from '../src/auth/firebase.config.js';
import membreSchema from '../models/Membre.js';

// Créer un nouveau membre
const createMembre = async (req, res) => {
    try {
        const membreData = {
            ...req.body,
            derniereModif: new Date()
        };
        const docRef = await db.collection('membres').add(membreData);
        res.status(201).json({ id: docRef.id, ...membreData });
    } catch (error) {
        console.error('Erreur lors de la création du membre:', error);
        res.status(400).json({ error: error.message });
    }
};

// Obtenir tous les membres
const getAllMembres = async (req, res) => {
    try {
        const snapshot = await db.collection('membres').get();
        const membres = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        res.json(membres);
    } catch (error) {
        console.error('Erreur lors de la récupération des membres:', error);
        res.status(500).json({ error: error.message });
    }
};

// Obtenir un membre par ID
const getMembreById = async (req, res) => {
    try {
        const doc = await db.collection('membres').doc(req.params.id).get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Membre non trouvé' });
        }
        res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
        console.error('Erreur lors de la récupération du membre:', error);
        res.status(500).json({ error: error.message });
    }
};

// Mettre à jour un membre
const updateMembre = async (req, res) => {
    try {
        const membreData = {
            ...req.body,
            derniereModif: new Date()
        };
        await db.collection('membres').doc(req.params.id).update(membreData);
        res.json({ id: req.params.id, ...membreData });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du membre:', error);
        res.status(400).json({ error: error.message });
    }
};

// Supprimer un membre
const deleteMembre = async (req, res) => {
    try {
        await db.collection('membres').doc(req.params.id).delete();
        res.status(204).send();
    } catch (error) {
        console.error('Erreur lors de la suppression du membre:', error);
        res.status(400).json({ error: error.message });
    }
};

// Rechercher des membres
const searchMembres = async (req, res) => {
    try {
        const searchTerm = req.params.term.toLowerCase();
        const snapshot = await db.collection('membres')
            .where('nom', '>=', searchTerm)
            .where('nom', '<=', searchTerm + '\uf8ff')
            .get();
        
        const membres = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        res.json(membres);
    } catch (error) {
        console.error('Erreur lors de la recherche des membres:', error);
        res.status(400).json({ error: error.message });
    }
};

export { createMembre, getAllMembres, getMembreById, updateMembre, deleteMembre, searchMembres }; 