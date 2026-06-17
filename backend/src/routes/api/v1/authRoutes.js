import { Router } from 'express';
import { register, login, refresh, logout, getMe } from '../../../controllers/authController.js';
import { protect } from '../../../middlewares/auth.js';

const router = Router();

// Public auth routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);

// Protected auth routes
router.get('/me', protect, getMe);

export default router;
