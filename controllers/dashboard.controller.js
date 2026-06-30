// controllers/dashboardController.js
import Product from '../models/products.model.js';
import Customer from '../models/customer.model.js';
import Supplier from '../models/suppliers.model.js';

export const getDashboardSummary = async (req, res) => {
  try {
    // Parallel fetching for performance
    const [products, customers, suppliers] = await Promise.all([
      Product.find({}),
      Customer.find({}),
      Supplier.find({})
    ]);

    // Data frontend ko send karein
    res.status(200).json({
      products,
      customers,
      suppliers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};