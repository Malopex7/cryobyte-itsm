import { Router } from 'express';
import { getClients, createClient, getUsers, getTechnicians, updateUser, getAdminMetrics } from '../../../controllers/adminController.js';
import { getQueues, createQueue, updateQueue, updateQueueMembers, deleteQueue } from '../../../controllers/queueController.js';
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

router.get('/technicians', getTechnicians);

router.route('/users/:id')
  .patch(updateUser);

// Queue (Bucket) management
router.route('/queues')
  .get(getQueues)
  .post(createQueue);

router.route('/queues/:id')
  .patch(updateQueue)
  .delete(deleteQueue);

router.patch('/queues/:id/members', updateQueueMembers);

export default router;
