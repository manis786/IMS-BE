import express from 'express';
import { createCustomer, getCustomers, updateCustomer } from '../controllers/customer.controller.js';

const router = express.Router();

router.post('/', createCustomer);
router.get('/', getCustomers);
router.put('/:id', updateCustomer);

export default router;