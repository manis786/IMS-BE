import express from 'express';
import { getSuppliers, addSupplier, updateSupplier, addSupplierPayment } from '../controllers/suppliers.controller.js';

const router = express.Router();

router.get('/', getSuppliers);
router.post('/', addSupplier);
router.put('/:id', updateSupplier);
router.post('/:id/payment', addSupplierPayment); // Ledger entry ke liye

export default router;