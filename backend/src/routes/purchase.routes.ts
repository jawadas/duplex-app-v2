import express, { Request, Response, NextFunction, Router } from 'express';
import { createPurchase, getPurchases, deletePurchase, updatePurchase } from '../controllers/purchase.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../types/auth.types';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2/promise';

// Add interface for Purchase row
interface PurchaseRow extends RowDataPacket {
  id: number;
  attachment_path: string;
}

const router: Router = express.Router();

// Add type annotations to route handlers
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  getPurchases(req, res).catch(next);
});

router.post('/', 
  authenticateToken,
  (req: Request, res: Response, next: NextFunction) => {
    createPurchase(req as AuthenticatedRequest, res).catch(next);
  }
);

router.delete('/:id',
  authenticateToken,
  (req: Request, res: Response, next: NextFunction) => {
    deletePurchase(req as AuthenticatedRequest, res).catch(next);
  }
);

router.put('/:id',
  authenticateToken,
  (req: Request, res: Response, next: NextFunction) => {
    updatePurchase(req as AuthenticatedRequest, res).catch(next);
  }
);

export default router;