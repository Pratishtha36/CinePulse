import { Router } from 'express';
import { registerUser, loginUser, demoLogin, loginWithGoogle } from '../services/authService';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { registerSchema, loginSchema, demoLoginSchema, googleAuthSchema } from '../validations/schemas';

const router = Router();

router.post('/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const result = await loginUser(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Google OAuth 2.0 Sign-In
router.post('/google', validateBody(googleAuthSchema), async (req, res, next) => {
  try {
    const result = await loginWithGoogle(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// One-click demo login for instant persona workspace switching
router.post('/demo', validateBody(demoLoginSchema), async (req, res, next) => {
  try {
    const { role } = req.body;
    const result = await demoLogin(role || 'CUSTOMER');
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticateJWT, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

export default router;
