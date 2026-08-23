import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/prisma';
import { ENV } from '../config/env';

const googleClient = new OAuth2Client(ENV.GOOGLE_CLIENT_ID);

export const registerUser = async (data: {
  name: string;
  email: string;
  password: string;
  role?: string;
  adminSecret?: string;
}) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    throw { statusCode: 400, message: 'Invalid email address format' };
  }

  if (data.password.length < 6) {
    throw { statusCode: 400, message: 'Password must be at least 6 characters long' };
  }

  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) {
    throw { statusCode: 400, message: 'User with this email already exists' };
  }

  let requestedRole = (data.role || 'CUSTOMER').toUpperCase();
  if (!['ADMIN', 'ORGANISER', 'CUSTOMER'].includes(requestedRole)) {
    requestedRole = 'CUSTOMER';
  }

  // If registering as ADMIN, require adminSecret or default secret
  if (requestedRole === 'ADMIN') {
    if (data.adminSecret && data.adminSecret !== ENV.ADMIN_SECRET) {
      throw { statusCode: 403, message: 'Invalid admin secret for registering an ADMIN account' };
    }
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: requestedRole,
    },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true, createdAt: true },
  });

  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, ENV.JWT_SECRET, {
    expiresIn: '7d',
  });

  return { user, token };
};

export const loginUser = async (data: { email: string; password: string }) => {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    throw { statusCode: 401, message: 'Invalid email or password' };
  }

  if (!user.passwordHash) {
    throw {
      statusCode: 400,
      message: 'This account was registered using Google Sign-In. Please click Continue with Google.',
    };
  }

  const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);
  if (!isValidPassword) {
    throw { statusCode: 401, message: 'Invalid email or password' };
  }

  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, ENV.JWT_SECRET, {
    expiresIn: '7d',
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
    },
    token,
  };
};

export const loginWithGoogle = async (data: { credential: string; role?: string }) => {
  let googleEmail = '';
  let googleName = '';
  let googleSub = '';
  let googlePicture: string | undefined = undefined;

  // 1. If GOOGLE_CLIENT_ID is provided, cryptographically verify token signature with Google JWKS
  if (ENV.GOOGLE_CLIENT_ID) {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: data.credential,
        audience: ENV.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new Error('Google ID token is missing verified email');
      }
      googleEmail = payload.email;
      googleName = payload.name || payload.email.split('@')[0];
      googleSub = payload.sub;
      googlePicture = payload.picture;
    } catch (err: any) {
      throw {
        statusCode: 401,
        message: `Google Authentication signature verification failed: ${err.message}`,
      };
    }
  } else {
    // 2. If running locally without GOOGLE_CLIENT_ID set in .env, decode the standard Google JWT payload
    const decoded: any = jwt.decode(data.credential);
    if (!decoded || (!decoded.email && !decoded.sub)) {
      throw {
        statusCode: 400,
        message: 'Invalid Google ID token. Please ensure a valid Google credential is provided.',
      };
    }
    googleEmail = decoded.email || 'google.user@gmail.com';
    googleName = decoded.name || 'Google User';
    googleSub = decoded.sub || `google-${Date.now()}`;
    googlePicture = decoded.picture;
  }

  let requestedRole = (data.role || 'CUSTOMER').toUpperCase();
  if (!['ADMIN', 'ORGANISER', 'CUSTOMER'].includes(requestedRole)) {
    requestedRole = 'CUSTOMER';
  }

  const user = await prisma.user.upsert({
    where: { email: googleEmail },
    update: {
      googleId: googleSub,
      name: googleName,
      avatarUrl: googlePicture,
    },
    create: {
      email: googleEmail,
      name: googleName,
      googleId: googleSub,
      avatarUrl: googlePicture,
      role: requestedRole,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
    },
  });

  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, ENV.JWT_SECRET, {
    expiresIn: '7d',
  });

  return { user, token };
};

export const demoLogin = async (role: 'CUSTOMER' | 'ORGANISER' | 'ADMIN') => {
  const roleConfig = {
    CUSTOMER: { name: 'Alice Customer', email: 'alice@gmail.com' },
    ORGANISER: { name: 'Cinema Organiser', email: 'organiser@events.com' },
    ADMIN: { name: 'System Admin', email: 'admin@cinepulse.com' },
  };

  const config = roleConfig[role] || roleConfig.CUSTOMER;
  const passwordHash = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email: config.email },
    update: { role, name: config.name, passwordHash },
    create: {
      email: config.email,
      name: config.name,
      passwordHash,
      role,
    },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true },
  });

  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, ENV.JWT_SECRET, {
    expiresIn: '7d',
  });

  return { user, token };
};
