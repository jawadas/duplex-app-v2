import express from 'express';
import { getAnalyticsSummary } from '../controllers/analytics.controller';
import { getDuplexCosts } from '../controllers/analytics.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

router.get('/summary', authenticateToken, getAnalyticsSummary);
router.get('/duplex-costs', authenticateToken, getDuplexCosts);

export default router;