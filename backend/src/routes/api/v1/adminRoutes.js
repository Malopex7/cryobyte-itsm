import { Router } from 'express';
import { getClients, createClient, getUsers, updateUser, getAdminMetrics } from '../../../controllers/adminController.js';
import { protect, requireRole } from '../../../middlewares/auth.js';

const router = Router();

// Protect all admin endpoints with session check & role-restriction
router.use(protect);
router.use(requireRole(['Admin']));

router.get('/metrics', getAdminMetrics);

router.route('/clients')
  .get(getClients)
  .post(createClient);

router.route('/users')
  .get(getUsers);

router.route('/users/:id')
  .patch(updateUser);

export default router;
