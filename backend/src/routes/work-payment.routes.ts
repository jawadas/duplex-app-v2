import express, { Router, RequestHandler } from 'express';
import { 
  getAllWorkPayments, 
  createWorkPayment, 
  updateWorkPayment,
  deleteWorkPayment 
} from '../controllers/work-payment.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router: Router = express.Router();

// Get all work payments with optional filters
router.get('/', authenticateToken, getAllWorkPayments as RequestHandler);

// Create a new work payment
router.post('/', authenticateToken, createWorkPayment as RequestHandler);

// Update a work payment
router.put('/:id', authenticateToken, updateWorkPayment as RequestHandler);

// Delete a work payment
router.delete('/:id', authenticateToken, deleteWorkPayment as RequestHandler);

export default router;
