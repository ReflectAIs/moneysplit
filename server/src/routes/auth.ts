import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import db from '../db/connection';
import { requireAuth, signToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Higher bcrypt cost for stronger password hashing
const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

const validate = (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  return null;
};

router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 1, max: 60 }).withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8, max: 72 }).withMessage('Password must be 8-72 characters')
  ],
  async (req: Request, res: Response) => {
    const invalid = validate(req, res);
    if (invalid) return invalid;

    const { name, email, password } = req.body;
    const existing = await db('users').where({ email: email.toLowerCase() }).first();
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const [user] = await db('users')
      .insert({ name, email: email.toLowerCase(), password_hash: hash })
      .returning(['id', 'email', 'name', 'role', 'created_at']);
    const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.created_at }
    });
  }
);

router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 1 }).withMessage('Password is required')
  ],
  async (req: Request, res: Response) => {
    const invalid = validate(req, res);
    if (invalid) return invalid;

    const { email, password } = req.body;
    const user = await db('users').where({ email: email.toLowerCase() }).first();
    // Generic error to avoid user enumeration
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.created_at }
    });
  }
);

// Request a password reset. Issues a one-time token (expires in 1 hour).
// NOTE: No email service is configured, so the token is returned in the response
// for development. In production, wire this up to an email provider.
router.post(
  '/forgot-password',
  [body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail()],
  async (req: Request, res: Response) => {
    const invalid = validate(req, res);
    if (invalid) return invalid;

    const { email } = req.body;
    const user = await db('users').where({ email: email.toLowerCase() }).first();

    // Always respond the same way to avoid user enumeration.
    if (!user) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    // Invalidate any previous unused tokens for this user.
    await db('password_resets').where({ user_id: user.id, used: false }).update({ used: true });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await db('password_resets').insert({ user_id: user.id, token, expires_at: expiresAt });

    res.json({
      message: 'If that email exists, a reset link has been sent.',
      // Dev convenience: return the token so the reset flow can be completed without an email service.
      resetToken: token
    });
  }
);

// Reset the password using a valid, unused, unexpired token.
router.post(
  '/reset-password',
  [
    body('token').trim().isLength({ min: 1 }).withMessage('Reset token is required'),
    body('password').isLength({ min: 8, max: 72 }).withMessage('Password must be 8-72 characters')
  ],
  async (req: Request, res: Response) => {
    const invalid = validate(req, res);
    if (invalid) return invalid;

    const { token, password } = req.body;
    const reset = await db('password_resets').where({ token }).first();
    if (!reset || reset.used) {
      return res.status(400).json({ error: 'Invalid or already used reset token' });
    }
    if (new Date(reset.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await db('users').where({ id: reset.user_id }).update({ password_hash: hash });
    await db('password_resets').where({ id: reset.id }).update({ used: true });

    res.json({ message: 'Password has been reset. You can now sign in.' });
  }
);

router.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

// Update profile (name / email). Email uniqueness is enforced.
router.put(
  '/profile',
  requireAuth,
  [
    body('name').optional().trim().isLength({ min: 1, max: 60 }).withMessage('Name must be 1-60 characters'),
    body('email').optional().trim().isEmail().withMessage('Valid email is required').normalizeEmail()
  ],
  async (req: AuthRequest, res: Response) => {
    const invalid = validate(req, res);
    if (invalid) return invalid;

    const { name, email } = req.body;
    const userId = req.user!.id;
    const updates: { name?: string; email?: string } = {};

    if (name !== undefined) updates.name = name;
    if (email !== undefined) {
      const normalized = email.toLowerCase();
      const conflict = await db('users').where({ email: normalized }).whereNot({ id: userId }).first();
      if (conflict) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }
      updates.email = normalized;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const [user] = await db('users')
      .where({ id: userId })
      .update(updates)
      .returning(['id', 'email', 'name', 'role', 'created_at']);

    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.created_at }
    });
  }
);

// Change password (requires current password).
router.post(
  '/change-password',
  requireAuth,
  [
    body('currentPassword').isLength({ min: 1 }).withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8, max: 72 }).withMessage('New password must be 8-72 characters')
  ],
  async (req: AuthRequest, res: Response) => {
    const invalid = validate(req, res);
    if (invalid) return invalid;

    const { currentPassword, newPassword } = req.body;
    const user = await db('users').where({ id: req.user!.id }).first();
    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await db('users').where({ id: user.id }).update({ password_hash: hash });

    res.json({ message: 'Password updated successfully' });
  }
);

export default router;
