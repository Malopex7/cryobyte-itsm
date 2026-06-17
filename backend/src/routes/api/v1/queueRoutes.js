import { Router } from 'express';
import { getQueues } from '../../../controllers/queueController.js';
import { protect } from '../../../middlewares/auth.js';

const router = Router();

router.use(protect);

// All authenticated staff can list queues (for assignment dropdowns and dashboard filtering)
router.get('/', getQueues);

export default router;
