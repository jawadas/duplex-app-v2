import express, { Request, Response, NextFunction, Router } from 'express';
import { getAllPurchaseTypes, createPurchaseType, deletePurchaseType } from '../controllers/purchase-type.controller';
import { authenticateToken, isAdmin } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../types/auth.types';

const router: Router = express.Router();

// Get all purchase types - no authentication needed
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  getAllPurchaseTypes(req, res).catch(next);
});

// Create a new purchase type - admin only
router.post('/', 
  authenticateToken,
  isAdmin,
  (req: Request, res: Response, next: NextFunction) => {
    createPurchaseType(req as AuthenticatedRequest, res).catch(next);
  }
);

// Delete a purchase type - admin only
router.delete('/:id',
  authenticateToken,
  isAdmin,
  (req: Request, res: Response, next: NextFunction) => {
    deletePurchaseType(req as AuthenticatedRequest, res).catch(next);
  }
);

export default router; 