import express from 'express'
import {receiveCustomerPayment,paySupplierBill} from '../controllers/payments.controller.js'
const router = express.Router()



// Customer Payment Received Router
router.post('/receive-payment',receiveCustomerPayment)

// Supplier pay by Bill Router
router.post('/pay-supplier',paySupplierBill)

export default router