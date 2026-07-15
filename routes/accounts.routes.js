import express from 'express';
import { 
  getChartOfAccounts, 
  createAccount, 
  updateAccount 
} from '../controllers/accounts.controller.js';

const router = express.Router();

// 1. GET: Saare accounts (Tree View)
router.get('/', getChartOfAccounts);

// 2. POST: Naya Account Add karna
router.post('/add', createAccount);

// 3. PUT: Existing Account ko Edit karna
router.put('/:id', updateAccount);

export default router;