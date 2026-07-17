import express from 'express';
import { 
  getChartOfAccounts, 
  createAccount, 
  updateAccount, 
  seedSystemAccounts,
  getParentGroups,
  deleteAccount
} from '../controllers/accounts.controller.js';

const router = express.Router();

// 1. GET: Saare accounts (Tree View)
router.get('/', getChartOfAccounts);

// 2. POST: Naya Account Add karna
router.post('/add', createAccount);

// 3. PUT: Existing Account ko Edit karna
router.put('/update/:id', updateAccount);
// Delete Account
router.delete('/delete/:id', deleteAccount);
// Parent Group Accounts Route
router.get('/parent-groups', getParentGroups);
// Seed System Accounts
router.post('/seed',seedSystemAccounts)
export default router;