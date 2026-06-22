import express from 'express';
import { addPurchase, receivePurchase ,getPurchases } from '../controllers/purchases.controller.js';

const router = express.Router();
router.get(`/`,getPurchases)
router.post('/', addPurchase);
router.patch('/:id/receive', receivePurchase);

export default router;