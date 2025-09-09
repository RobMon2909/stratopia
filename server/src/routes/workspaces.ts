import { Router } from 'express';
import { getWorkspaces, createWorkspace, getWorkspaceLists } from '../controllers/workspaceController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.route('/').get(protect, getWorkspaces).post(protect, createWorkspace);
router.route('/:id/lists').get(protect, getWorkspaceLists);

export default router;