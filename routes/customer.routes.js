import express from 'express';
import { createCustomer, getCustomers, updateCustomer, deleteCustomer } from '../controllers/customer.controller.js';

const router = express.Router();

router.post('/', createCustomer);
router.get('/', getCustomers);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;