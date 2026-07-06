// controllers/dashboardController.js
import Product from '../models/products.model.js';
import Customer from '../models/customer.model.js';
import Supplier from '../models/suppliers.model.js';
import Purchase from '../models/purchases.model.js'
import Sale from "../models/sale.model.js"

export const getDashboardSummary = async (req, res) => {
  try {
    const [products, customers, suppliers, purchases, sales] = await Promise.all([
      Product.find({}),
      Customer.find({}),
      Supplier.find({}),
      Purchase.find({}),
      Sale.find({}) // Agar yeh line error de rahi hai, toh iska matlab import missing hai
    ]);
    
    res.status(200).json({ products, customers, suppliers, purchases, sales });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};