import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { AppError } from '../middlewares/error.js';

/**
 * Stream an asset directly from GridFS bucket with proper Content-Type headers
 */
export const streamAsset = async (req, res, next) => {
  try {
    const { fileId } = req.params;

    // 1. Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return next(new AppError('Invalid file ID format', 400));
    }

    const objectId = new mongoose.Types.ObjectId(fileId);

    // 2. Ensure database connection is active
    if (!mongoose.connection.db) {
      return next(new AppError('Database connection is offline', 500));
    }

    // 3. Query metadata from media.files
    const file = await mongoose.connection.db.collection('media.files').findOne({ _id: objectId });

    if (!file) {
      return next(new AppError('Asset not found', 404));
    }

    // 4. Set headers for inline preview rendering
    const contentType = file.contentType || 'application/octet-stream';
    res.set({
      'Content-Type': contentType,
      'Content-Length': file.length,
      'Content-Disposition': `inline; filename="${file.filename}"`,
      'Accept-Ranges': 'bytes'
    });

    // 5. Open download stream and pipe directly into the Express response object
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'media' });
    const downloadStream = bucket.openDownloadStream(objectId);

    downloadStream.pipe(res);

    // 6. Handle errors in download stream cleanly
    downloadStream.on('error', (err) => {
      // Forward the error if headers have not been sent yet
      if (!res.headersSent) {
        next(err);
      }
    });
  } catch (error) {
    next(error);
  }
};
