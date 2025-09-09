import { Router } from 'express';
import { createList } from '../controllers/listController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.route('/').post(protect, createList);

export default router;