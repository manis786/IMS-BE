import express from 'express';
import { createVoucher , getNextVoucherNumber } from '../controllers/voucher.controller.js';

const router = express.Router();

// POST: Create new double-entry voucher and post to journals
router.post('/create', createVoucher);

router.get('/next-number/:type', getNextVoucherNumber);

export default router;