import express from 'express';
import { 
  getAllProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} from '../controllers/products.controller.js';

const router = express.Router();

// Route for getting all products
router.get('/', getAllProducts);

// Route for creating a new product
router.post('/', createProduct);

// Route for updating an existing product by ID
// Ensure your frontend sends the request to /api/products/:id
router.put('/:id', updateProduct);

// Route for deleting a product by ID
// Ensure your frontend sends the request to /api/products/:id
router.delete('/:id', deleteProduct);

export default router;