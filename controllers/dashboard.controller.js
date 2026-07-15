// controllers/dashboard.controller.js
import Product from '../models/products.model.js';
import Customer from '../models/customer.model.js';
import Supplier from '../models/suppliers.model.js';
import Purchase from '../models/purchases.model.js';
import Sale from '../models/sale.model.js';
import Transaction from '../models/transactions.model.js';
import { Category } from '../models/categories.model.js';

export const getDashboardSummary = async (req, res) => {
  try {
    // ── Parallel fetch ─────────────────────────────────────────────────────────
    const [products, customers, suppliers, purchases, sales, transactions, categories] = await Promise.all([
      Product.find({}).populate('category', 'name'),
      Customer.find({}),
      Supplier.find({}),
      Purchase.find({}).sort({ date: -1 }),
      Sale.find({}).sort({ date: -1 }),
      Transaction.find({}).sort({ createdAt: -1 }),
      Category.find({})
    ]);

    // ── Monthly Analytics (last 6 months) ─────────────────────────────────────
    const monthlyMap = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-PK', { month: 'short', year: 'numeric' });
      monthlyMap[key] = { month: label, revenue: 0, profit: 0, expenses: 0, transactions: 0 };
    }

    // Sales se revenue compute karo
    sales.forEach(sale => {
      const key = (sale.date || '').slice(0, 7);
      if (!monthlyMap[key]) return;
      monthlyMap[key].revenue += (sale.grandTotal || 0);
      monthlyMap[key].transactions += 1;
    });

    // Mock expenses list (since no Expense model exists yet in DB)
    const mockExpenses = [
      { amount: 150000, date: '2026-06-01' },
      { amount: 100000, date: '2026-06-01' },
      { amount: 84500, date: '2026-06-05' },
      { amount: 62300, date: '2026-06-06' },
      { amount: 12400, date: '2026-06-07' },
      { amount: 320000, date: '2026-06-02' },
      { amount: 160000, date: '2026-06-02' },
      { amount: 25000, date: '2026-06-04' },
      { amount: 45000, date: '2026-06-03' },
      { amount: 20000, date: '2026-06-08' },
      { amount: 18500, date: '2026-06-04' },
      { amount: 12000, date: '2026-06-05' },
      { amount: 35000, date: '2026-06-01' },
      { amount: 8800, date: '2026-06-06' },
      { amount: 6500, date: '2026-06-06' },
      { amount: 5400, date: '2026-06-09' },
      { amount: 8500, date: '2026-06-08' },
      { amount: 15000, date: '2026-06-07' },
      { amount: 10000, date: '2026-06-05' },
      { amount: 30000, date: '2026-06-04' },
      { amount: 15000, date: '2026-06-10' },
      { amount: 8000, date: '2026-06-02' },
      { amount: 6000, date: '2026-06-09' },
      { amount: 4800, date: '2026-06-08' },
      { amount: 15000, date: '2026-06-07' },
      { amount: 35000, date: '2026-06-03' },
      { amount: 10000, date: '2026-06-06' },
      { amount: 8000, date: '2026-06-01' },
      { amount: 3200, date: '2026-06-09' },
      { amount: 6500, date: '2026-06-04' },
      { amount: 20000, date: '2026-06-12' },
      { amount: 12000, date: '2026-06-12' },
      { amount: 3300, date: '2026-06-13' },
      { amount: 10000, date: '2026-06-10' },
      { amount: 5800, date: '2026-06-11' },
      { amount: 18000, date: '2026-06-01' },
      { amount: 15000, date: '2026-06-08' },
      { amount: 12000, date: '2026-06-05' },
      { amount: 4800, date: '2026-06-07' },
      { amount: 4000, date: '2026-06-10' },
      { amount: 25000, date: '2026-07-02' },
      { amount: 12000, date: '2026-07-05' },
      { amount: 8500, date: '2026-07-09' },
    ];

    mockExpenses.forEach(exp => {
      const dateStr = exp.date ? exp.date.slice(0, 7) : '';
      if (monthlyMap[dateStr]) {
        monthlyMap[dateStr].expenses += exp.amount;
      }
    });

    // Profit = revenue - COGS (estimated as 25% of revenue if no transaction data)
    Object.values(monthlyMap).forEach(m => {
      m.profit = Math.max(0, m.revenue * 0.25); // 25% gross margin estimate
    });

    const monthlyAnalytics = Object.values(monthlyMap);

    // ── Weekly Sales (last 7 days) ─────────────────────────────────────────────
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      weeklyMap[dateStr] = { day: dayNames[d.getDay()], sales: 0, count: 0 };
    }
    sales.forEach(sale => {
      const key = (sale.date || '').slice(0, 10);
      if (weeklyMap[key]) {
        weeklyMap[key].sales += (sale.grandTotal || 0);
        weeklyMap[key].count += 1;
      }
    });
    const weeklySales = Object.values(weeklyMap);

    // ── Category Distribution (from transactions SALE type) ────────────────────
    const categoryColors = ['#3b82f6','#06b6d4','#f59e0b','#eab308','#a3a3a3','#ec4899','#8b5cf6','#d97706','#38bdf8','#6b7280','#10b981','#ef4444'];

    // Build productId -> categoryName map
    const productCatMap = {};
    products.forEach(p => {
      productCatMap[String(p._id)] = (p.category && p.category.name) ? p.category.name : 'Others';
    });

    const catRevMap = {};
    transactions.filter(t => t.type === 'SALE').forEach(t => {
      const cat = productCatMap[String(t.product)] || 'Others';
      catRevMap[cat] = (catRevMap[cat] || 0) + (t.totalAmount || 0);
    });

    // Fallback: agar transactions nahi hain toh products by category count karo
    if (Object.keys(catRevMap).length === 0) {
      products.forEach(p => {
        const cat = (p.category && p.category.name) ? p.category.name : 'Others';
        catRevMap[cat] = (catRevMap[cat] || 0) + (p.salePrice || 0);
      });
    }

    const categoryDistribution = Object.entries(catRevMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value], i) => ({ name, value, color: categoryColors[i % categoryColors.length] }));

    // ── Payment Method Share (from Sales) ──────────────────────────────────────
    const paymentColors = { Cash: '#10b981', Card: '#3b82f6', Mobile: '#06b6d4', Credit: '#ef4444' };
    const payMap = {};
    sales.forEach(sale => {
      const pm = sale.paymentMethod || 'Cash';
      payMap[pm] = (payMap[pm] || 0) + (sale.grandTotal || 0);
    });
    const paymentMethodShare = Object.entries(payMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value, color: paymentColors[name] || '#6b7280' }));

    // ── Stock Levels (from SALE/PURCHASE transactions) ─────────────────────────
    // Compute stock per product from transactions
    const stockMap = {};
    transactions.forEach(t => {
      const pid = String(t.product);
      if (!stockMap[pid]) stockMap[pid] = 0;
      if (t.type === 'PURCHASE') stockMap[pid] += (t.quantity || 0);
      else if (t.type === 'SALE' || t.type === 'RETURN') stockMap[pid] -= (t.quantity || 0);
    });

    // Attach stock to products and compute levels
    let inStock = 0, lowStock = 0, outStock = 0;
    const productsWithStock = products.map(p => {
      const stock = Math.max(0, stockMap[String(p._id)] || 0);
      const minS = p.minStock || 10;
      if (stock === 0) outStock++;
      else if (stock <= minS) lowStock++;
      else inStock++;
      return { ...p.toObject(), stock };
    });

    const stockLevels = [
      { name: 'In Stock', value: inStock, color: '#10b981' },
      { name: 'Low Stock', value: lowStock, color: '#f59e0b' },
      { name: 'Out of Stock', value: outStock, color: '#ef4444' }
    ];

    // ── Recent Sales (Activity Feed) ───────────────────────────────────────────
    const recentTransactions = sales.slice(0, 10).map(s => ({
      id: s.invoiceNumber,
      date: s.date,
      time: s.createdAt ? new Date(s.createdAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : '',
      total: s.grandTotal,
      paymentType: s.paymentMethod,
      customer: s.customer ? String(s.customer) : 'Walk-In',
      status: s.status
    }));

    res.status(200).json({
      products: productsWithStock,
      customers,
      suppliers,
      purchases,
      sales,
      monthlyAnalytics,
      weeklySales,
      categoryDistribution,
      paymentMethodShare,
      stockLevels,
      recentTransactions,
    });

  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ message: error.message });
  }
};