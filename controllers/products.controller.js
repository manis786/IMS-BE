import { Product } from '../models/products.model.js';
import { sendResponse } from '../libs/responseHandler.js';

// 1. Get All Products
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    sendResponse(res, 200, true, 'Products fetched successfully', products);
  } catch (error) {
    sendResponse(res, 500, false, 'Failed to fetch products', error.message);
  }
};

// 2. Create Product (With Duplicate Check)
// export const createProduct = async (req, res) => {
//   try {
//     // req.body se fields ko alag nikalen
//     const { id, name, brand, categoryId, costPrice, salePrice, stock, minStock, barcode, status } = req.body;

//     // Naya object banayen jo aapke Mongoose Schema se exact match karta ho
//     const newProduct = await Product.create({
//       id: id, // Agar schema mai 'id' field hai, warna is line ko hata dein
//       name,
//       brand,
//       category: categoryId, // <--- Frontend ki categoryId ko schema ki 'category' field mai map karein (agar schema mai naam 'category' hai)
//       costPrice,
//       salePrice,
//       stock,
//       minStock,
//       barcode,
//       status
//     });

//     // Success response
//     res.status(201).json({ success: true, data: newProduct });
//   } catch (error) {
//     // Yeh console.log aapko terminal mai exact error dikhayega ke galti kahan hai
//     console.error("Mongoose Save Error:", error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

export const createProduct = async (req, res) => {
  try {
    // 1. Frontend se 'category' aa raha hai (na ke 'categoryId'), isliye destructuring update ki
    const { id, name, brand, category, costPrice, salePrice, stock, minStock, barcode, status } = req.body;

    // 2. Validation check (taake crash na ho)
    if (!name || !costPrice || !salePrice) {
      return res.status(400).json({ success: false, message: "Required fields missing" });
    }

    // 3. New Product creation
    const newProduct = await Product.create({
      id, 
      name,
      brand,
      category, // Frontend 'category' field bhej raha hai, yahi database mein jayega
      costPrice: Number(costPrice), // Ensure kar rahe hain ke ye number ho
      salePrice: Number(salePrice),
      stock: stock || 0,
      minStock: minStock || 10,
      barcode,
      status: status || 'active'
    });

    res.status(201).json({ success: true, data: newProduct });
  } catch (error) {
    console.error("Mongoose Save Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Update Product
// Backend Controller mein
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params; // Yahan MongoDB ki '_id' aa rahi hai
    
    // findOneAndUpdate ke bajaye findByIdAndUpdate use karein
    const updated = await Product.findByIdAndUpdate(id, req.body, { new: true });

    if (!updated) {
      return sendResponse(res, 404, false, 'Product not found');
    }
    sendResponse(res, 200, true, 'Product updated successfully', updated);
  } catch (error) {
    sendResponse(res, 400, false, 'Update failed', error.message);
  }
};

// 4. Delete Product
// Backend Controller mein
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params; // Yeh MongoDB ki '_id' hai
    const deleted = await Product.findByIdAndDelete(id); // ID se delete karein

    if (!deleted) {
      return sendResponse(res, 404, false, 'Product not found');
    }
    sendResponse(res, 200, true, 'Product deleted successfully');
  } catch (error) {
    sendResponse(res, 400, false, 'Delete failed', error.message);
  }
};