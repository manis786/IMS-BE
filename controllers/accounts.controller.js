import Account from '../models/accounts.model.js';
export const getChartOfAccounts = async (req, res) => {
  try {
    const allAccounts = await Account.find().sort({ code: 1 });

    // Agar database mein kuch nahi hai, to seedha empty array bhejo
    if (!allAccounts || allAccounts.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: "No accounts found", 
        data: [] // Yahan empty array bhej rahe hain
      });
    }

    // Tree building logic
    const buildTree = (parentId = null) => {
      return allAccounts
        .filter(acc => String(acc.parent || '') === String(parentId || ''))
        .map(acc => ({
          ...acc.toObject(),
          children: buildTree(acc._id)
        }));
    };

    res.status(200).json({ success: true, data: buildTree() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

export const createAccount = async (req, res) => {
  try {
    const { name, code, level, type, parent, isGroup } = req.body;
    
    // Check duplication
    const existing = await Account.findOne({ code });
    if (existing) return res.status(400).json({ success: false, message: 'Code already exists' });

    const newAccount = await Account.create({ name, code, level, type, parent: parent || null, isGroup: isGroup || false });
    res.status(201).json({ success: true, data: newAccount });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
// Edit/Update Account
export const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, level, type, parent } = req.body;

    const updatedAccount = await Account.findByIdAndUpdate(
      id,
      { name, code, level, type, parent },
      { new: true } // Ye updated object return karega
    );

    if (!updatedAccount) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    res.status(200).json({ success: true, data: updatedAccount });
  } catch (err) {
    res.status(400).json({ success: false, message: "Update failed", error: err.message });
  }
};