// controllers/ai.controller.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import Product from '../models/products.model.js';
import Customer from '../models/customer.model.js';
import Supplier from '../models/suppliers.model.js';
import Purchase from '../models/purchases.model.js';
import Sale from '../models/sale.model.js';
import Transaction from '../models/transactions.model.js';
import { Category } from '../models/categories.model.js';
import config from '../config/config.js';

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

// ── Build live context from MongoDB ───────────────────────────────────────────
const buildContext = async () => {
  const [products, customers, suppliers, purchases, sales, transactions, categories] = await Promise.all([
    Product.find({}).populate('category', 'name').lean(),
    Customer.find({}).lean(),
    Supplier.find({}).lean(),
    Purchase.find({}).populate('supplier', 'name').lean(),
    Sale.find({}).lean(),
    Transaction.find({}).lean(),
    Category.find({}).lean(),
  ]);

  // Stock per product from transactions
  const stockMap = {};
  transactions.forEach(t => {
    const pid = String(t.product);
    if (!stockMap[pid]) stockMap[pid] = 0;
    if (t.type === 'PURCHASE') stockMap[pid] += (t.quantity || 0);
    else if (t.type === 'SALE') stockMap[pid] -= (t.quantity || 0);
  });

  const productsWithStock = products.map(p => ({
    ...p,
    currentStock: Math.max(0, stockMap[String(p._id)] || 0),
    category: p.category?.name || 'Unknown',
  }));

  const lowStockProducts = productsWithStock.filter(p => p.currentStock > 0 && p.currentStock <= (p.minStock || 10));
  const outOfStockProducts = productsWithStock.filter(p => p.currentStock === 0);
  const inStockProducts = productsWithStock.filter(p => p.currentStock > (p.minStock || 10));

  const totalRevenue = sales.reduce((s, sale) => s + (sale.grandTotal || 0), 0);
  const totalPayable = purchases.reduce((s, po) => s + (po.totalAmount || 0), 0);
  const totalCustomerBalance = customers.reduce((s, c) => s + (c.balance || 0), 0);
  const totalSupplierBalance = suppliers.reduce((s, sup) => s + (sup.balance || 0), 0);

  return {
    summary: {
      totalProducts: products.length,
      totalCategories: categories.length,
      totalCustomers: customers.length,
      activeCustomers: customers.filter(c => c.status === 'active').length,
      totalSuppliers: suppliers.length,
      activeSuppliers: suppliers.filter(s => s.status === 'active').length,
      totalSales: sales.length,
      totalRevenue,
      totalPurchaseOrders: purchases.length,
      totalPayable,
      totalCustomerBalance,
      totalSupplierBalance,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      inStockCount: inStockProducts.length,
    },
    products: productsWithStock.slice(0, 100).map(p => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      costPrice: p.costPrice,
      salePrice: p.salePrice,
      currentStock: p.currentStock,
      minStock: p.minStock || 10,
      status: p.status,
      stockStatus: p.currentStock === 0 ? 'OUT_OF_STOCK' : p.currentStock <= (p.minStock || 10) ? 'LOW_STOCK' : 'IN_STOCK',
    })),
    lowStockProducts: lowStockProducts.map(p => ({ name: p.name, category: p.category, currentStock: p.currentStock, minStock: p.minStock || 10 })),
    outOfStockProducts: outOfStockProducts.map(p => ({ name: p.name, category: p.category })),
    customers: customers.slice(0, 50).map(c => ({
      name: c.name,
      phone: c.phone,
      email: c.email,
      balance: c.balance,
      creditLimit: c.creditLimit,
      isCreditEnabled: c.isCreditEnabled,
      status: c.status,
    })),
    suppliers: suppliers.map(s => ({
      name: s.name,
      contact: s.contact,
      phone: s.phone,
      city: s.city,
      balance: s.balance,
      paymentTerms: s.paymentTerms,
      status: s.status,
      totalOrders: s.totalOrders,
    })),
    recentSales: sales.slice(0, 20).map(s => ({
      invoiceNumber: s.invoiceNumber,
      date: s.date,
      grandTotal: s.grandTotal,
      paymentMethod: s.paymentMethod,
      status: s.status,
    })),
    recentPurchases: purchases.slice(0, 20).map(po => ({
      supplier: po.supplier?.name || 'Unknown',
      totalAmount: po.totalAmount,
      status: po.status,
      date: po.date,
    })),
  };
};

// ── System Prompt Builder ──────────────────────────────────────────────────────
const buildSystemPrompt = (context) => {
  return `You are MartPro AI — an intelligent business assistant for "Exclusive Mart" (a retail supermarket ERP system). You have access to REAL-TIME live data from the database.

You speak in a friendly, professional manner. You can respond in Urdu, English, or mixed (Urdu-English), based on the user's language.

## LIVE BUSINESS DATA (as of now):

### SUMMARY:
- Total Products: ${context.summary.totalProducts}
- Total Customers: ${context.summary.totalCustomers} (Active: ${context.summary.activeCustomers})
- Total Suppliers: ${context.summary.totalSuppliers} (Active: ${context.summary.activeSuppliers})
- Total Sales: ${context.summary.totalSales}
- Total Revenue: Rs ${context.summary.totalRevenue.toLocaleString()}
- Total Purchase Orders: ${context.summary.totalPurchaseOrders}
- Total Payable to Suppliers: Rs ${context.summary.totalPayable.toLocaleString()}
- Customer Outstanding Balances: Rs ${context.summary.totalCustomerBalance.toLocaleString()}
- Inventory: ${context.summary.inStockCount} In Stock, ${context.summary.lowStockCount} Low Stock, ${context.summary.outOfStockCount} Out of Stock

### PRODUCTS (${context.products.length} shown):
${JSON.stringify(context.products, null, 2)}

### LOW STOCK ITEMS:
${JSON.stringify(context.lowStockProducts, null, 2)}

### OUT OF STOCK ITEMS:
${JSON.stringify(context.outOfStockProducts, null, 2)}

### CUSTOMERS (${context.customers.length} shown):
${JSON.stringify(context.customers, null, 2)}

### SUPPLIERS:
${JSON.stringify(context.suppliers, null, 2)}

### RECENT SALES (last 20):
${JSON.stringify(context.recentSales, null, 2)}

### RECENT PURCHASES (last 20):
${JSON.stringify(context.recentPurchases, null, 2)}

## INSTRUCTIONS:
- Always answer based on the REAL DATA provided above.
- Use Rs (Pakistani Rupees) for all monetary values.
- Format numbers with commas (e.g., Rs 1,250,000).
- When listing items, use bullet points or numbered lists for clarity.
- If asked about something not in the data, say so honestly.
- Keep responses concise but complete.
- If asked in Urdu, reply in Urdu. If in English, reply in English.`;
};

// ── Main chat handler (SSE Streaming) ────────────────────────────────────────
export const chatWithAI = async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const sendChunk = (type, text) => {
    res.write(`data: ${JSON.stringify({ type, text })}\n\n`);
  };

  try {
    // Fetch live DB context
    sendChunk('status', 'Fetching live data...');
    const context = await buildContext();
    sendChunk('status', 'Analyzing with Gemini 2.5 Flash...');

    const model = genAI.getGenerativeModel({
      model: 'Gemini-3.1-Flash-Lite',
      systemInstruction: buildSystemPrompt(context),
    });

    // Build chat history for multi-turn
    const chatHistory = history.map(msg => ({
     role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }],
    })).filter(msg => msg.role === 'user' );

    const validHistory = chatHistory.length > 0 && chatHistory[0].role !== 'user' 
    ? chatHistory.slice(1) 
    : chatHistory;

    const chat = model.startChat({ history: chatHistory });

    const result = await chat.sendMessageStream(message);

    sendChunk('start', '');

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        sendChunk('chunk', chunkText);
      }
    }

    sendChunk('done', '');
    res.end();
  } catch (err) {
    console.error('AI Chat error:', err);
    sendChunk('error', err.message || 'AI request failed');
    res.end();
  }
};
