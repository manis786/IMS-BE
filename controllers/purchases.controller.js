import Purchase from '../models/purchases.model.js';
import  Product  from '../models/products.model.js';
import Supplier from '../models/suppliers.model.js';

export const addPurchase = async (req, res) => {
  try {
    const newPurchase = await Purchase.create(req.body);
    res.status(201).json({ success: true, data: newPurchase });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
export const getPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find()
      .populate('supplier', 'name')             // Supplier ka naam
      .populate('items.product', 'name');      // ZAROORI: Items ke andar product ka naam
      
    res.status(200).json({ success: true, data: purchases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const receivePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase || purchase.status === 'Received') return res.status(400).json({ message: "Invalid PO" });

    // SIRF STATUS UPDATE KAREIN, LOOP HATA DIYA HAI
    purchase.status = 'Received';
    await purchase.save();

    await Supplier.findByIdAndUpdate(purchase.supplier, { $inc: { balance: purchase.totalAmount } });

    res.status(200).json({ success: true, data: purchase });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};