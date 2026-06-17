import { Router } from 'express';
import { streamAsset } from '../../../controllers/assetController.js';
import { upload } from '../../../middlewares/upload.js';

const router = Router();

// Route for chunk-streaming previews
router.get('/:fileId/stream', streamAsset);

// Route for direct file uploads to GridFS
router.post('/upload', upload.array('files', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded.' });
  }
  
  // Return the fileIds of the uploaded files
  const uploadedAssets = req.files.map(f => ({
    fileId: f.fileId,
    filename: f.filename,
    contentType: f.contentType
  }));
  
  res.status(201).json({ assets: uploadedAssets });
});

export default router;
