import express from 'express';
import { createMembre, getAllMembres, getMembreById, updateMembre, deleteMembre, searchMembres } from '../controllers/membreController.js';

const router = express.Router();

// Créer un nouveau membre
router.post('/', createMembre);

// Obtenir tous les membres
router.get('/', getAllMembres);

// Obtenir un membre par son ID
router.get('/:id', getMembreById);

// Mettre à jour un membre
router.put('/:id', updateMembre);

// Supprimer un membre
router.delete('/:id', deleteMembre);

// Rechercher des membres
router.get('/search/:term', searchMembres);

export default router; 