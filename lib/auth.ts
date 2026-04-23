import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { getUserByPhone, createUser } from './db';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'milk_truck_secret_key_2024';
const COOKIE_NAME = 'auth_token';

export interface AuthUser {
  id: number;
  phone_number: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: AuthUser): string {
  return jwt.sign({ id: user.id, phone: user.phone_number }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; phone: string };
    return { id: decoded.id, phone_number: decoded.phone };
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function login(phoneNumber: string, password: string): Promise<{ success: boolean; token?: string; error?: string }> {
  const normalized = phoneNumber.trim();
  const user = await getUserByPhone(normalized);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  const hash = user.password_hash;
  if (typeof hash !== 'string' || !hash) {
    return { success: false, error: 'Account data is invalid. Register again or contact support.' };
  }

  const valid = await comparePassword(password, hash);
  if (!valid) {
    return { success: false, error: 'Invalid password' };
  }

  const id = Number(user.id);
  const phone = String(user.phone_number ?? normalized);
  const token = generateToken({ id, phone_number: phone });
  return { success: true, token };
}

export async function register(phoneNumber: string, password: string): Promise<{ success: boolean; error?: string }> {
  const normalized = phoneNumber.trim();
  const existing = await getUserByPhone(normalized);
  if (existing) {
    return { success: false, error: 'Phone number already registered' };
  }

  const passwordHash = await hashPassword(password);
  await createUser(normalized, passwordHash);
  return { success: true };
}

export function setAuthCookie(token: string): void {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
}

export function clearAuthCookie(): void {
  cookies().delete(COOKIE_NAME);
}