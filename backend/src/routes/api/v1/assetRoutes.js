import { Router } from 'express';
import { streamAsset } from '../../../controllers/assetController.js';

const router = Router();

// Route for chunk-streaming previews
router.get('/:fileId/stream', streamAsset);

export default router;
