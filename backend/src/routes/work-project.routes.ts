import express, { RequestHandler } from 'express';
import {
  createWorkProject,
  getWorkProjectById,
  getWorkProjectPayments,
  addWorkProjectPayment,
  getAllWorkProjects
} from '../controllers/work-project.controller';
import { WorkProject, Payment } from '../types/labor.types';

const router = express.Router();

// Type assertions with specific parameter types
const typedCreateWorkProject = createWorkProject as RequestHandler<{}, any, WorkProject>;
const typedGetWorkProjectById = getWorkProjectById as RequestHandler<{ id: string }>;
const typedGetWorkProjectPayments = getWorkProjectPayments as RequestHandler<{ id: string }>;
const typedAddWorkProjectPayment = addWorkProjectPayment as RequestHandler<{ id: string }, any, Omit<Payment, 'id' | 'created_at' | 'updated_at'>>;
const typedGetAllWorkProjects = getAllWorkProjects as RequestHandler;

// Get all work projects
router.get('/', typedGetAllWorkProjects);

// Create a new work project
router.post('/', typedCreateWorkProject);

// Get a work project by ID
router.get('/:id', typedGetWorkProjectById);

// Get all payments for a work project
router.get('/:id/payments', typedGetWorkProjectPayments);

// Add a payment to a work project
router.post('/:id/payments', typedAddWorkProjectPayment);

export default router;
