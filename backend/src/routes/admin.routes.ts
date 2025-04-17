import express from 'express';
import { 
  getUserActivity, 
  getUserActionHistory, 
  updateUserRole,
  getLoginActivity,
  getUserDetailedActivity,
  getUsers
} from '../controllers/admin.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = express.Router();

// Get all users
router.get('/users', authenticateToken, authorizeRole(['admin']), getUsers);

// Get all users' activity statistics
router.get('/users/activity', authenticateToken, authorizeRole(['admin']), getUserActivity);

// Get specific user's action history
router.get('/users/:userId/history', authenticateToken, authorizeRole(['admin']), getUserActionHistory);

// Update user role
router.put('/users/:userId/role', authenticateToken, authorizeRole(['admin']), updateUserRole);

// Get login activity
router.get('/login-activity', authenticateToken, authorizeRole(['admin']), getLoginActivity);

// Get detailed user activity
router.get('/users/activity/detailed', authenticateToken, authorizeRole(['admin']), getUserDetailedActivity);

export default router; 