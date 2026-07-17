import Account from '../models/accounts.model.js';
import Transaction from '../models/transactions.model.js'
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
// create Account Logic
export const createAccount = async (req, res) => {
  try {
    let { name, code, isGroup, parent, level, type } = req.body;

    // 🔥 FIX 1: Agar level 3 hai aur parent mojood hai tabhi auto-generate karein
    if (level === 3 && parent && parent !== "") {
      // Pehle parent account (Level 2) ki details nikalo
      const parentAccount = await Account.findById(parent);
      if (!parentAccount) {
        return res.status(404).json({ success: false, message: "Parent group not found!" });
      }

      // Dhundo ke is parent ke andar aakhri account code kya chal raha hai
      const lastSibling = await Account.findOne({ parent: parent }).sort({ code: -1 });

      let newCode;
      if (lastSibling) {
        newCode = String(parseInt(lastSibling.code) + 1);
      } else {
        newCode = String(parseInt(parentAccount.code) + 1);
      }

      const newAccount = await Account.create({
        name,
        code: newCode,
        level: 3,
        type: parentAccount.type, // Parent ki type inherit hogi
        parent,
        isGroup: isGroup || false
      });

      return res.status(201).json({ success: true, data: newAccount });
    }

    // 🔥 FIX 2: Level 1 ya Level 2 ke liye agar parent string khali hai to null karein
    const finalParent = (!parent || parent === "") ? null : parent;

    const fallbackAccount = await Account.create({
      name,
      code,
      level,
      type,
      parent: finalParent,
      isGroup: isGroup || false
    });

    res.status(201).json({ success: true, data: fallbackAccount });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Edit/Update Account
export const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body; // Hum sirf name edit allow karenge, code aur level change karne se hierarchy kharab ho sakti hai

    if (!name) {
      return res.status(400).json({ success: false, message: "Account title is required" });
    }

    const updatedAccount = await Account.findByIdAndUpdate(
      id,
      { name },
      { new: true, runValidators: true }
    );

    if (!updatedAccount) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    res.status(200).json({ success: true, message: "Account updated successfully!", data: updatedAccount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
// Dynamic System Accounts Seed Function
// Equity ke Level 2 aur Level 3 ke sath complete automated seeding
// Complete Seeding Script from PDF Template
export const seedSystemAccounts = async (req, res) => {
  try {
    // 1. Purana data wipe-out karein
    await Account.deleteMany({});

    // ==========================================
    // LEVEL 1: MAIN HEADS (Parent: null)
    // ==========================================
    const assetL1 = await Account.create({ name: 'Assets', code: '1000', level: 1, type: 'Asset', parent: null, isGroup: true });
    const liabilityL1 = await Account.create({ name: 'Liabilities', code: '2000', level: 1, type: 'Liability', parent: null, isGroup: true });
    const equityL1 = await Account.create({ name: 'Equity', code: '3000', level: 1, type: 'Equity', parent: null, isGroup: true });
    const revenueL1 = await Account.create({ name: 'Revenue', code: '4000', level: 1, type: 'Revenue', parent: null, isGroup: true });
    const expenseL1 = await Account.create({ name: 'Expenses', code: '5000', level: 1, type: 'Expense', parent: null, isGroup: true });

    // ==========================================
    // LEVEL 2: SUB-GROUPS & LEVEL 3: LEDGERS
    // ==========================================

    // --- ASSETS SUB-GROUPS & LEDGERS ---
    const bankL2 = await Account.create({ name: 'Bank Accounts', code: '1100', level: 2, type: 'Asset', parent: assetL1._id, isGroup: true });
    await Account.create({ name: 'Checking Acct', code: '1101', level: 3, type: 'Asset', parent: bankL2._id, isGroup: false });
    await Account.create({ name: 'Petty Cash Purchasing', code: '1102', level: 3, type: 'Asset', parent: bankL2._id, isGroup: false });
    await Account.create({ name: 'Savings Account', code: '1103', level: 3, type: 'Asset', parent: bankL2._id, isGroup: false });
    await Account.create({ name: 'Savings for Taxes', code: '1104', level: 3, type: 'Asset', parent: bankL2._id, isGroup: false });

    const currentAssetsL2 = await Account.create({ name: 'Current Assets', code: '1200', level: 2, type: 'Asset', parent: assetL1._id, isGroup: true });
    await Account.create({ name: 'Accounts Receivable', code: '1201', level: 3, type: 'Asset', parent: currentAssetsL2._id, isGroup: false });
    await Account.create({ name: 'Employee Advance', code: '1202', level: 3, type: 'Asset', parent: currentAssetsL2._id, isGroup: false });
    await Account.create({ name: 'Inventory Asset', code: '1301', level: 3, type: 'Asset', parent: currentAssetsL2._id, isGroup: false });
    await Account.create({ name: 'Undeposited Funds', code: '1203', level: 3, type: 'Asset', parent: currentAssetsL2._id, isGroup: false });

    const fixedAssetsL2 = await Account.create({ name: 'Fixed Assets', code: '1400', level: 2, type: 'Asset', parent: assetL1._id, isGroup: true });
    await Account.create({ name: 'Accumulated Amortization', code: '1401', level: 3, type: 'Asset', parent: fixedAssetsL2._id, isGroup: false });
    await Account.create({ name: 'Ammortized Assets: Organization Costs', code: '1402', level: 3, type: 'Asset', parent: fixedAssetsL2._id, isGroup: false });
    await Account.create({ name: 'Fixed Assets: Accum Depreciation F & E', code: '1403', level: 3, type: 'Asset', parent: fixedAssetsL2._id, isGroup: false });
    await Account.create({ name: 'Fixed Assets: Fixtures & Equipment', code: '1404', level: 3, type: 'Asset', parent: fixedAssetsL2._id, isGroup: false });
    await Account.create({ name: 'Fixed Assets: Furniture and Equipment', code: '1405', level: 3, type: 'Asset', parent: fixedAssetsL2._id, isGroup: false });
    await Account.create({ name: 'Fixed Assets: Tenant Improvements', code: '1406', level: 3, type: 'Asset', parent: fixedAssetsL2._id, isGroup: false });
    await Account.create({ name: 'Security Deposits Asset', code: '1407', level: 3, type: 'Asset', parent: fixedAssetsL2._id, isGroup: false });

    // --- LIABILITIES SUB-GROUPS & LEDGERS ---
    const payablesL2 = await Account.create({ name: 'Accounts Payable', code: '2100', level: 2, type: 'Liability', parent: liabilityL1._id, isGroup: true });
    await Account.create({ name: 'Accounts Payable', code: '2101', level: 3, type: 'Liability', parent: payablesL2._id, isGroup: false });

    const creditCardsL2 = await Account.create({ name: 'Credit Cards', code: '2200', level: 2, type: 'Liability', parent: liabilityL1._id, isGroup: true });
    await Account.create({ name: 'Bank of America Credit Card', code: '2201', level: 3, type: 'Liability', parent: creditCardsL2._id, isGroup: false });
    await Account.create({ name: 'Chase Mastercard', code: '2202', level: 3, type: 'Liability', parent: creditCardsL2._id, isGroup: false });
    await Account.create({ name: 'Visa Card', code: '2203', level: 3, type: 'Liability', parent: creditCardsL2._id, isGroup: false });

    const shortLiabilitiesL2 = await Account.create({ name: 'Current & Payroll Liabilities', code: '2300', level: 2, type: 'Liability', parent: liabilityL1._id, isGroup: true });
    await Account.create({ name: 'Loans Payable', code: '2301', level: 3, type: 'Liability', parent: shortLiabilitiesL2._id, isGroup: false });
    await Account.create({ name: 'Payroll Liabilities: Fed Unemployment Payable', code: '2302', level: 3, type: 'Liability', parent: shortLiabilitiesL2._id, isGroup: false });
    await Account.create({ name: 'Payroll Liabilities: Fed Withholding Payable', code: '2303', level: 3, type: 'Liability', parent: shortLiabilitiesL2._id, isGroup: false });
    await Account.create({ name: 'Payroll Liabilities: Medicare Payable', code: '2304', level: 3, type: 'Liability', parent: shortLiabilitiesL2._id, isGroup: false });
    await Account.create({ name: 'Payroll Liabilities: Social Security Payable', code: '2305', level: 3, type: 'Liability', parent: shortLiabilitiesL2._id, isGroup: false });
    await Account.create({ name: 'Sales Tax Payable', code: '2306', level: 3, type: 'Liability', parent: shortLiabilitiesL2._id, isGroup: false });
    await Account.create({ name: 'Other Long Term Liabilities', code: '2401', level: 3, type: 'Liability', parent: liabilityL1._id, isGroup: false });

    // --- EQUITY SUB-GROUPS & LEDGERS ---
    const equitySubL2 = await Account.create({ name: 'Capital & Reserves', code: '3100', level: 2, type: 'Equity', parent: equityL1._id, isGroup: true });
    await Account.create({ name: 'Opening Balance Equity', code: '3101', level: 3, type: 'Equity', parent: equitySubL2._id, isGroup: false });
    await Account.create({ name: 'Capital Account - Partner Contributions', code: '3102', level: 3, type: 'Equity', parent: equitySubL2._id, isGroup: false });
    await Account.create({ name: 'Capital Account - Draws', code: '3103', level: 3, type: 'Equity', parent: equitySubL2._id, isGroup: false });
    const retainedEarnings = await Account.create({ name: 'Retained Earnings', code: '3104', level: 3, type: 'Equity', parent: equitySubL2._id, isGroup: false });

    // --- REVENUE SUB-GROUPS & LEDGERS ---
    const operatingRevenueL2 = await Account.create({ name: 'Sales Revenue', code: '4100', level: 2, type: 'Revenue', parent: revenueL1._id, isGroup: true });
    await Account.create({ name: 'Bank Account Interest Income', code: '4101', level: 3, type: 'Revenue', parent: operatingRevenueL2._id, isGroup: false });
    await Account.create({ name: 'Clones Income', code: '4102', level: 3, type: 'Revenue', parent: operatingRevenueL2._id, isGroup: false });
    await Account.create({ name: 'Concentrate Sales', code: '4103', level: 3, type: 'Revenue', parent: operatingRevenueL2._id, isGroup: false });
    await Account.create({ name: 'Delivery Fees', code: '4104', level: 3, type: 'Revenue', parent: operatingRevenueL2._id, isGroup: false });
    await Account.create({ name: 'Edibles Sales', code: '4105', level: 3, type: 'Revenue', parent: operatingRevenueL2._id, isGroup: false });
    await Account.create({ name: 'Medicine Sales', code: '4106', level: 3, type: 'Revenue', parent: operatingRevenueL2._id, isGroup: false });
    const mainRevenue = await Account.create({ name: 'Merchandise Sales', code: '4107', level: 3, type: 'Revenue', parent: operatingRevenueL2._id, isGroup: false });
    await Account.create({ name: 'Merchandise Sales Discounts', code: '4108', level: 3, type: 'Revenue', parent: operatingRevenueL2._id, isGroup: false });
    await Account.create({ name: 'Service Sales', code: '4109', level: 3, type: 'Revenue', parent: operatingRevenueL2._id, isGroup: false });
    await Account.create({ name: 'Other Income', code: '4110', level: 3, type: 'Revenue', parent: operatingRevenueL2._id, isGroup: false });

    // --- EXPENSES (COGS & OPERATING) SUB-GROUPS & LEDGERS ---
    const cogsL2 = await Account.create({ name: 'Cost of Goods Sold', code: '5100', level: 2, type: 'Expense', parent: expenseL1._id, isGroup: true });
    await Account.create({ name: 'All Growing Costs: Utilities', code: '5101', level: 3, type: 'Expense', parent: cogsL2._id, isGroup: false });
    await Account.create({ name: 'All Growing Costs: Salaries & Wages', code: '5102', level: 3, type: 'Expense', parent: cogsL2._id, isGroup: false });
    await Account.create({ name: 'All Growing Costs: Nutrients & Supplies', code: '5103', level: 3, type: 'Expense', parent: cogsL2._id, isGroup: false });
    await Account.create({ name: 'Medicine: Adjustments to Inventory', code: '5104', level: 3, type: 'Expense', parent: cogsL2._id, isGroup: false });
    const mainCogs = await Account.create({ name: 'Medicine Purchases', code: '5105', level: 3, type: 'Expense', parent: cogsL2._id, isGroup: false });
    await Account.create({ name: 'Medicine: Packaging Materials', code: '5106', level: 3, type: 'Expense', parent: cogsL2._id, isGroup: false });

    const operatingExpL2 = await Account.create({ name: 'Operating Expenses', code: '5200', level: 2, type: 'Expense', parent: expenseL1._id, isGroup: true });
    await Account.create({ name: 'Advertising & Promotion', code: '5201', level: 3, type: 'Expense', parent: operatingExpL2._id, isGroup: false });
    await Account.create({ name: 'Amortization Expense', code: '5202', level: 3, type: 'Expense', parent: operatingExpL2._id, isGroup: false });
    await Account.create({ name: 'Bank Service Charges', code: '5203', level: 3, type: 'Expense', parent: operatingExpL2._id, isGroup: false });
    await Account.create({ name: 'Communications Expense', code: '5204', level: 3, type: 'Expense', parent: operatingExpL2._id, isGroup: false });
    await Account.create({ name: 'Office Supplies', code: '5205', level: 3, type: 'Expense', parent: operatingExpL2._id, isGroup: false });
    await Account.create({ name: 'Rent & Lease Expense', code: '5206', level: 3, type: 'Expense', parent: operatingExpL2._id, isGroup: false });
    await Account.create({ name: 'Professional Fees: Accounting & Legal', code: '5207', level: 3, type: 'Expense', parent: operatingExpL2._id, isGroup: false });
    await Account.create({ name: 'Utilities', code: '5208', level: 3, type: 'Expense', parent: operatingExpL2._id, isGroup: false });
    await Account.create({ name: 'Ask My Accountant (Other Expense)', code: '5209', level: 3, type: 'Expense', parent: operatingExpL2._id, isGroup: false });

    // 5. Response mein real ObjectIDs pass kardo
    res.status(201).json({
      success: true,
      message: 'PDF Template Chart of Accounts successfully seeded!',
      copyToYourEnv: {
        ACCOUNT_CASH_ID: "Ghar me manually copy karne ki zarorat nahi, Postman response dekhein",
        ACCOUNT_RECEIVABLE_CODE: "1201",
        ACCOUNT_INVENTORY_CODE: "1301",
        ACCOUNT_PAYABLE_CODE: "2101",
        ACCOUNT_REVENUE_ID: mainRevenue._id,
        ACCOUNT_COGS_ID: mainCogs._id,
        ACCOUNT_EQUITY_RETAINED_ID: retainedEarnings._id
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// For Level 2 Accounts in Drop Down
export const getParentGroups = async (req, res) => {
  try {
    // 🔥 Frontend se query parameter aayega (e.g., ?level=1 ya ?level=2)
    // Agar kuch na bhejein to default Level 2 uthaye
    const filterLevel = req.query.level ? parseInt(req.query.level) : 2;

    // Sirf woh accounts uthao jo requested level ke hain aur isGroup: true hain
    const groups = await Account.find({ level: filterLevel, isGroup: true })
                         .select('name code type')
                         .sort({ code: 1 });
                         
    res.status(200).json({ success: true, data: groups });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete Account when No Sub Account is Created or Transactions
export const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;

    // CHECK 1: Kya is account ke andar mazeed sub-accounts (bachay) hain?
    const hasChildren = await Account.findOne({ parent: id });
    if (hasChildren) {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot delete a Group Account that contains sub-accounts. Delete the sub-accounts first!" 
      });
    }

    // CHECK 2: Kya is account par koi bhi transaction record exist karta hai?
    // Yeh query check karegi ke transaction collection mein yeh id kisi bhi entry mein use hui hai ya nahi
    const hasTransactions = await Transaction.findOne({ accountId: id }); // Agar aapki field ka naam account hai to { account: id } check karein
    if (hasTransactions) {
      return res.status(400).json({ 
        success: false, 
        message: "This account cannot be deleted because it has active transaction records linked to it!" 
      });
    }

    // Agar dono checks clear hain, tabhi delete chalega
    const deletedAccount = await Account.findByIdAndDelete(id);
    if (!deletedAccount) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    res.status(200).json({ success: true, message: "Account deleted successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};