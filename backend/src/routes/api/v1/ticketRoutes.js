import { Router } from 'express';
import { getTickets, getTicket, createTicket, updateTicket } from '../../../controllers/ticketController.js';
import { getTechnicians } from '../../../controllers/adminController.js';
import { protect } from '../../../middlewares/auth.js';

const router = Router();

// Protect all ticket endpoints
router.use(protect);

router.route('/')
  .get(getTickets)
  .post(createTicket);

// Static route MUST be declared before /:id — otherwise Express treats "technicians" as a ticket id
router.get('/technicians', getTechnicians);

router.route('/:id')
  .get(getTicket)
  .patch(updateTicket);

export default router;
