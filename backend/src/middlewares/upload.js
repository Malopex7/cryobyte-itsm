import multer from 'multer';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

/**
 * Custom Multer storage engine that pipes file streams directly into MongoDB GridFS bucket.
 */
class GridFsStorage {
  constructor() {
    this.bucket = null;
  }

  _handleFile(req, file, cb) {
    try {
      // 1. Initialize the bucket if not already initialized
      if (!this.bucket) {
        if (!mongoose.connection.db) {
          return cb(new Error('MongoDB connection is not established. Cannot initialize GridFSBucket.'));
        }
        this.bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'media' });
      }

      // 2. Open GridFS upload stream with appropriate options
      const uploadStream = this.bucket.openUploadStream(file.originalname, {
        contentType: file.mimetype
      });

      // 3. Pipe the incoming file stream directly into the upload stream
      file.stream.pipe(uploadStream);

      // 4. Handle stream lifecycle events
      uploadStream.on('error', (err) => {
        cb(err);
      });

      uploadStream.on('finish', () => {
        // Attach file metadata to the file object for controller access
        cb(null, {
          fileId: uploadStream.id,
          filename: uploadStream.filename,
          contentType: file.mimetype
        });
      });
    } catch (err) {
      cb(err);
    }
  }

  _removeFile(req, file, cb) {
    try {
      if (!this.bucket) {
        this.bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'media' });
      }

      if (file.fileId) {
        this.bucket.delete(file.fileId)
          .then(() => cb(null))
          .catch((err) => cb(err));
      } else {
        cb(null);
      }
    } catch (err) {
      cb(err);
    }
  }
}

// Instantiate the custom storage engine
const storage = new GridFsStorage();

// Export the configured multer instance
export const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // Limit file size to 20MB
  }
});
