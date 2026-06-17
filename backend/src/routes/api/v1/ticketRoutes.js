import { Router } from 'express';
import { getTickets, getTicket, createTicket, updateTicket } from '../../../controllers/ticketController.js';
import { protect } from '../../../middlewares/auth.js';

const router = Router();

// Protect all ticket endpoints
router.use(protect);

router.route('/')
  .get(getTickets)
  .post(createTicket);

router.route('/:id')
  .get(getTicket)
  .patch(updateTicket);

export default router;
