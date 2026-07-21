import express from "express"
import connectDB from "./config/connectDB.js"
import config from "./config/config.js"
import cors from "cors"
import productRoutes from "./routes/products.routes.js"
import categoryRoutes from "./routes/categories.routes.js"
import suppliersRoutes from "./routes/suppliers.routes.js"
import purchaseroutes from "./routes/purchases.routes.js"
import transactionsRoutes from "./routes/transactions.routes.js"
import customerRoutes from "./routes/customer.routes.js"
import salesRoutes from './routes/sales.routes.js'
import authroutes from "./routes/auth.routes.js"
import dashboardRoutes from "./routes/dashboard.routes.js"
import aiRoutes from "./routes/ai.routes.js"
import accountsRoutes from "./routes/accounts.routes.js"
import reportsRoutes from './routes/reports.routes.js';
import paymentRoutes from './routes/payments.routes.js'
const app = express()
app.use (cors())
app.use (express.json())
connectDB()


// Routes
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes)
app.use(`/api/suppliers`,suppliersRoutes)
app.use(`/api/purchases`,purchaseroutes)
app.use(`/api/transactions`,transactionsRoutes)
app.use('/api/customers', customerRoutes);
app.use('/api/sales', salesRoutes);
app.use(`/api/auth`,authroutes)
app.use(`/api/dashboard`,dashboardRoutes)
app.use(`/api/ai`, aiRoutes)
app.use('/api/finance/COA',accountsRoutes)
app.use('/api/reports', reportsRoutes);
app.use('/api/payments',paymentRoutes)


// Server
app.listen(config.PORT ,()=>{
    console.log(`Server Is UP and Running on PORT : ${config.PORT}`)
})