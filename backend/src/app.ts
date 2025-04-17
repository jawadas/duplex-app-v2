import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import purchaseRoutes from './routes/purchase.routes';
import workProjectRoutes from './routes/work-project.routes';
import workPaymentRoutes from './routes/work-payment.routes';
import analyticsRoutes from './routes/analytics.routes';
import adminRoutes from './routes/admin.routes';
import path from 'path';
import { appLogger } from './config/logger.config';
import authRoutes from './routes/auth.routes';
import { authenticateToken, authorizeRole } from './middleware/auth.middleware';
import { Request, Response } from 'express';
import pool from './config/database';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Log environment variables for debugging (excluding sensitive data)
console.log('Environment variables loaded:', {
  NODE_ENV: process.env.NODE_ENV,
  API_PORT: process.env.API_PORT,
  API_PREFIX: process.env.API_PREFIX,
  hasRegistrationKey: !!process.env.REGISTRATION_KEY
});

const app = express();
const port = process.env.API_PORT || 3000;
const apiPrefix = process.env.API_PREFIX || '/api';

// Middleware
app.use(cors({
  origin: true, // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization'],
  credentials: false // Set to false since we're using token-based auth
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  appLogger.info(`Incoming ${req.method} request to ${req.url}`, {
    method: req.method,
    url: req.url,
    query: req.query,
    headers: req.headers,
    body: req.body,
  });

  // Log response
  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - startTime;
    
    appLogger.info(`Response sent for ${req.method} ${req.url}`, {
      duration: `${duration}ms`,
      statusCode: res.statusCode,
      body: body
    });
    
    return originalSend.call(this, body);
  };
  
  next();
});

// Serve static files from uploads directory
// Routes
app.use(`${apiPrefix}/purchases`, authenticateToken, purchaseRoutes);
app.use(`${apiPrefix}/work-projects`, authenticateToken, workProjectRoutes);
app.use(`${apiPrefix}/work-payments`, authenticateToken, workPaymentRoutes);
app.use(`${apiPrefix}/analytics`, authenticateToken, analyticsRoutes);
app.use(`${apiPrefix}/admin`, authenticateToken, adminRoutes);
app.use(`${apiPrefix}/auth`, authRoutes);


// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  appLogger.error('Application error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    query: req.query
  });
  
  res.status(500).json({ error: err.message });
});

app.listen(port, () => {
  appLogger.info(`Server is running on port ${port}`);
});

export const analyticsController = {
  getSummary: async (req: Request, res: Response) => {
    try {
      // Perform your calculations, for example:
      const [purchasesResult] = await pool.query(
        'SELECT SUM(amount) as totalPurchases FROM purchases'
      );
      const [paymentsResult] = await pool.query(
        'SELECT SUM(amount) as totalPayments FROM work_payments'
      );

      const summary = {
        totalPurchases: (purchasesResult as any[])[0]?.totalPurchases || 0,
        totalPayments: (paymentsResult as any[])[0]?.totalPayments || 0,
        totalCosts: ((purchasesResult as any[])[0]?.totalPurchases || 0) + ((paymentsResult as any[])[0]?.totalPayments || 0)
      };

      res.json(summary);
    } catch (error) {
      console.error('Error in analytics controller:', error);
      res.status(500).json({ message: 'Error getting analytics summary' });
    }
  },

  getDuplexCosts: async (req: Request, res: Response) => {
    try {
      // Implement your duplex costs calculation
      const [results] = await pool.query(`
        SELECT 
          duplex_number,
          SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END) as purchaseAmount,
          SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END) as paymentAmount,
          SUM(amount) as totalAmount
        FROM (
          SELECT duplex_number, amount, 'purchase' as type FROM purchases
          UNION ALL
          SELECT duplex_number, amount, 'payment' as type FROM work_payments
        ) combined
        GROUP BY duplex_number
        ORDER BY duplex_number
      `);

      res.json(results);
    } catch (error) {
      console.error('Error in analytics controller:', error);
      res.status(500).json({ message: 'Error getting duplex costs' });
    }
  }
};

export default app;
