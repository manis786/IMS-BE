import express from 'express';
import { createSale, getAllSales, updateSaleStatus } from '../controllers/sales.controller.js';

const router = express.Router();

// Sales create karne ka route
router.post('/', createSale);
router.get('/',getAllSales)
router.put('/:id',updateSaleStatus)

export default router;