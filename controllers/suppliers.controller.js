import Supplier from '../models/suppliers.model.js'

// Get All Suppliers
export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add Supplier
export const addSupplier = async (req, res) => {
  try {
    const newSupplier = await Supplier.create(req.body);
    res.status(201).json({ success: true, data: newSupplier });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update Supplier
export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Supplier.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Supplier not found" });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Add Supplier Payment (Ledger Entry)
export const addSupplierPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, method } = req.body;
    
    // Logic: Supplier ka balance kam karna
    const supplier = await Supplier.findById(id);
    if (!supplier) return res.status(404).json({ success: false, message: "Supplier not found" });

    supplier.balance -= amount;
    await supplier.save();

    res.status(200).json({ success: true, data: supplier });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};