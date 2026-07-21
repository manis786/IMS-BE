import express from 'express';
import { createSale, getAllSales, updateSaleStatus,getUnpaidSalesByCustomer } from '../controllers/sales.controller.js';

const router = express.Router();

// Sales create karne ka route
router.post('/', createSale);
router.get('/',getAllSales)
router.put('/:id',updateSaleStatus)
router.get('/unpaid/:customerId', getUnpaidSalesByCustomer)

export default router;