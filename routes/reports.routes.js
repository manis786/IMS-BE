import express from 'express';
import { getTrialBalance } from '../controllers/reports.controller.js';

const router = express.Router();

// GET /api/reports/trial-balance
router.get('/trial-balance', getTrialBalance);

export default router;