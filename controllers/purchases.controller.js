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
    if (!purchase || purchase.status === 'Approved') return res.status(400).json({ message: "Invalid PO" });

    // SIRF STATUS UPDATE KAREIN, LOOP HATA DIYA HAI
    purchase.status = 'Approved';
    await purchase.save();

    await Supplier.findByIdAndUpdate(purchase.supplier, { $inc: { balance: purchase.totalAmount } });

    res.status(200).json({ success: true, data: purchase });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
export const updatePurchaseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // 1. Purchase ko find aur update karo
    const updatedPurchase = await Purchase.findByIdAndUpdate(
      id, 
      { status: status }, 
      { new: true }
    );

    if (!updatedPurchase) {
      return res.status(404).json({ message: "Purchase record nahi mila!" });
    }

    // 2. Agar status 'approved' hai, toh stock badha do (Optional: agar aap yehi chahte hain)
    if (status === 'approved') {
        for (const item of updatedPurchase.items) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { stock: item.quantity }
            });
        }
    }

    res.status(200).json({ message: "Status updated successfully", updatedPurchase });
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ error: "Update failed: " + err.message });
  }
};
