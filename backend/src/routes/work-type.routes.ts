import express from 'express';
import {
  createWorkType,
  getAllWorkTypes,
  getWorkTypeById,
  updateWorkType,
  deleteWorkType
} from '../controllers/work-type.controller';

const router = express.Router();

// Create a new work type
router.post('/', createWorkType);

// Get all work types
router.get('/', getAllWorkTypes);

// Get a single work type by ID
// router.get('/:id', getWorkTypeById);

// // Update a work type
// router.put('/:id', updateWorkType);

// // Delete a work type
// router.delete('/:id', deleteWorkType);

export default router;
