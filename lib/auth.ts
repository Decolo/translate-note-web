import bcrypt from 'bcryptjs';
import { supabase } from './supabase';
import { randomUUID } from 'crypto';

export const SESSION_COOKIE_NAME = 'sb_session';

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  session_token: string;
  expires_at: string;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface SessionWithUser {
  session: Session;
  user: User;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUser(email: string, password: string): Promise<User> {
  const passwordHash = await hashPassword(password);

  const { data, error } = await supabase
    .from('users')
    .insert([{ email, password_hash: passwordHash }])
    .select('id, email, created_at, updated_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Email already exists');
    }
    throw error;
  }

  return data;
}

export async function getOrCreateUserByEmail(email: string): Promise<User> {
  const existing = await getUserByEmail(email);
  if (existing) {
    return existing;
  }

  const randomSecret = `oauth-${randomUUID()}-${Date.now()}`;
  return createUser(email, randomSecret);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, created_at, updated_at')
    .eq('email', email)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, created_at, updated_at')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function verifyUserCredentials(
  email: string,
  password: string
): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) return null;

  const isValid = await verifyPassword(password, data.password_hash);
  if (!isValid) return null;

  return {
    id: data.id,
    email: data.email,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<Session> {
  const sessionToken = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

  const { data, error } = await supabase
    .from('sessions')
    .insert([
      {
        user_id: userId,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function getSessionByToken(
  sessionToken: string
): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('session_token', sessionToken)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  // Check if session is expired
  if (new Date(data.expires_at) < new Date()) {
    await deleteSession(sessionToken);
    return null;
  }

  return data;
}

export async function getSessionWithUser(
  sessionToken: string
): Promise<SessionWithUser | null> {
  const session = await getSessionByToken(sessionToken);
  if (!session) return null;

  const user = await getUserById(session.user_id);
  if (!user) return null;

  return { session, user };
}

export async function deleteSession(sessionToken: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('session_token', sessionToken);

  if (error) throw error;
}

export async function deleteUserSessions(userId: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}

export async function cleanExpiredSessions(): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .lt('expires_at', new Date().toISOString());

  if (error) throw error;
}
