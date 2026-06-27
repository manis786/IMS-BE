import express from 'express';
import { createSale } from '../controllers/sales.controller.js';

const router = express.Router();

// Sales create karne ka route
router.post('/', createSale);

export default router;