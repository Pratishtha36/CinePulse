import { Router } from 'express';
import multer from 'multer';
import { createEvent, createShow, getOrganiserRevenueSummary } from '../services/eventService';
import { authenticateJWT, authorizeRoles, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createEventSchema, createShowSchema, presignedPosterUploadSchema } from '../validations/schemas';
import { generatePosterUploadUrl, uploadBufferToCloudStorage, ALLOWED_POSTER_MIME_TYPES, MAX_POSTER_SIZE_BYTES } from '../services/storageService';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_POSTER_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_POSTER_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${ALLOWED_POSTER_MIME_TYPES.join(', ')}`));
    }
  },
});

// Protect organiser routes for roles 'ORGANISER' or 'ADMIN'
router.use(authenticateJWT, authorizeRoles('ORGANISER', 'ADMIN'));

/**
 * Step 1: Request Presigned URL for Direct-to-Cloud (AWS S3 / Cloudflare R2) Upload
 */
router.post(
  '/upload/presigned-url',
  validateBody(presignedPosterUploadSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const uploadData = await generatePosterUploadUrl(req.body);
      res.json(uploadData);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Direct server-side upload endpoint (fallback if direct-to-cloud browser upload encounters CORS)
 */
router.post(
  '/upload/local',
  upload.single('poster'),
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file uploaded.' });
      }

      const fileUrl = await uploadBufferToCloudStorage(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      res.json({
        success: true,
        fileUrl,
        fileName: req.file.originalname,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/events', validateBody(createEventSchema), async (req: AuthRequest, res, next) => {
  try {
    const event = await createEvent(req.user!.userId, req.body);
    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
});

router.post('/shows', validateBody(createShowSchema), async (req: AuthRequest, res, next) => {
  try {
    const show = await createShow(req.user!.userId, req.body);
    res.status(201).json(show);
  } catch (err) {
    next(err);
  }
});

router.get('/analytics/summary', async (req: AuthRequest, res, next) => {
  try {
    const summary = await getOrganiserRevenueSummary(req.user!.userId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

export default router;
