import express, { Request, Response, NextFunction } from 'express';
import authController from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

// Types for type checking request bodies
interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

// interface GoogleAuthRequest {
//   token: string;
// }

const router = express.Router();

// Wrap async controllers to catch errors
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

router.post('/register', asyncHandler((req, res, next) => authController.register(req, res)));
router.post('/login', asyncHandler((req, res, next) => authController.login(req, res)));
// router.post('/google', asyncHandler((req, res, next) => authController.googleLogin(req, res)));
router.get('/verify', asyncHandler((req, res, next) => authController.verify(req, res)));
router.post('/logout', authenticateToken, asyncHandler((req, res, next) => authController.logout(req, res, next)));

export default router;