import Customer from '../models/customer.model.js';
// Create New Customer
export const createCustomer = async (req, res) => {
  try {
    const customer = new Customer(req.body);
    await customer.save();
    res.status(201).json(customer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get All Customers
export const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Customer (Balance ya Profile)
export const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id, req.body, 
      { new: true,runValidators: true});
    res.json(customer);
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    
    res.json(customer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};