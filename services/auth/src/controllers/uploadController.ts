import { Request, Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { respond, asyncHandler, createLogger } from '@evient/shared';

import fs from 'fs';
import path from 'path';

const logger = createLogger('upload-controller');

// Create local uploads directory if it doesn't exist
const localUploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(localUploadDir)) {
  fs.mkdirSync(localUploadDir, { recursive: true });
}

const useCloudinary = !!process.env.CLOUDINARY_CLOUD_NAME;

if (useCloudinary) {
  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Configure Storage
let storage;

if (useCloudinary) {
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req: any, file: any) => {
      let folderName = 'evient_uploads';
      if (req.body.folder) folderName = `evient_uploads/${req.body.folder}`;
      return {
        folder: folderName,
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "")}`,
      };
    },
  });
} else {
  storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, localUploadDir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  });
}

export const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * POST /api/upload
 * Generic route to upload files and return the Cloudinary URL
 */
export const handleUpload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    return respond.error(res, 'No file provided', 400);
  }

  let fileUrl = '';
  
  if (useCloudinary) {
    fileUrl = (req.file as any).path || (req.file as any).secure_url;
  } else {
    // Local URL serving - you may need to expose this folder in your Express app
    // Currently hardcoded to localhost:3001 assuming Auth runs on 3001
    fileUrl = `http://localhost:3000/api/auth/uploads/${req.file.filename}`;
  }
  
  if (!fileUrl) {
    return respond.error(res, 'Failed to upload file to Cloudinary', 500);
  }

  logger.info(`File uploaded successfully: ${fileUrl}`);

  respond.successWithMessage(res, { url: fileUrl }, 'File uploaded successfully');
});
