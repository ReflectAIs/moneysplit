import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import db from '../db/connection';
import { requireAuth, signToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Higher bcrypt cost for stronger password hashing
const BCRYPT_ROUNDS = 12;

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

router.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

export default router;
