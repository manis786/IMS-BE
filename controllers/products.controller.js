import  Product  from '../models/products.model.js';
import { sendResponse } from '../libs/responseHandler.js';

// 1. Get All Products
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.aggregate([
      {
        $lookup: {
          from: 'categories', // Tumhare MongoDB mein collection ka naam
          localField: 'category', 
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $lookup: {
          from: 'transactions',
          localField: '_id',
          foreignField: 'product',
          as: 'stockData'
        }
      },
      {
        $project: {
          name: 1, 
          id: 1, 
          brand: { $ifNull: ["$brand", ""] },
          barcode: { $ifNull: ["$barcode", ""] },
          minStock: { $ifNull: ["$minStock", 10] },
          costPrice: 1, 
          salePrice: 1,
          category: 1,
          categoryInfo: { $arrayElemAt: ["$categoryInfo", 0] },
          status: { $ifNull: ["$status", "active"] },
          createdAt: 1,
          stock: {
            $reduce: {
              input: "$stockData",
              initialValue: 0,
              in: {
                $add: [
                  "$$value",
                  { $cond: [{ $in: ["$$this.type", ["PURCHASE", "RETURN"]] }, "$$this.quantity", { $multiply: ["$$this.quantity", -1] }] }
                ]
              }
            }
          }
        }
      }
    ]);
    sendResponse(res, 200, true, 'Products fetched successfully', products);
  } catch (error) {
    sendResponse(res, 500, false, 'Failed to fetch products', error.message);
  }
};

// 2. Create Product
export const createProduct = async (req, res) => {
  try {
    const { id, name, brand, category, costPrice, salePrice, stock, minStock, barcode, status } = req.body;

    if (!name || !costPrice || !salePrice) {
      return res.status(400).json({ success: false, message: "Required fields missing" });
    }

    const payload = {
      name,
      brand: brand || '',
      category,
      costPrice: Number(costPrice),
      salePrice: Number(salePrice),
      stock: Number(stock) || 0,
      minStock: Number(minStock) || 10,
      barcode: barcode || '',
      status: status || 'active'
    };

    if (id && id.trim()) {
      payload.id = id.trim();
    }

    const newProduct = await Product.create(payload);
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