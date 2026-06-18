import { Router } from 'express';
import { getClients, createClient, getUsers, getTechnicians, updateUser, getAdminMetrics, createUser, bulkCreateUsers, deleteUser } from '../../../controllers/adminController.js';
import { getQueues, createQueue, updateQueue, updateQueueMembers, deleteQueue } from '../../../controllers/queueController.js';
import { protect, requireRole } from '../../../middlewares/auth.js';

const router = Router();

router.use(protect);
router.use(requireRole(['Admin']));

router.get('/metrics', getAdminMetrics);

router.route('/clients')
  .get(getClients)
  .post(createClient);

router.route('/users')
  .get(getUsers)
  .post(createUser);

router.post('/users/bulk', bulkCreateUsers);

router.get('/technicians', getTechnicians);

router.route('/users/:id')
  .patch(updateUser)
  .delete(deleteUser);

// Queue (Bucket) management
router.route('/queues')
  .get(getQueues)
  .post(createQueue);

router.route('/queues/:id')
  .patch(updateQueue)
  .delete(deleteQueue);

router.patch('/queues/:id/members', updateQueueMembers);

export default router;

