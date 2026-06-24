import express from 'express';
import { addTransaction, getTransactionsByProduct , getAllTransactions } from '../controllers/transactions.controller.js';

const router = express.Router();

router.post('/', addTransaction);
router.get(`/`,getAllTransactions)
router.get('/:productId', getTransactionsByProduct);

export default router;