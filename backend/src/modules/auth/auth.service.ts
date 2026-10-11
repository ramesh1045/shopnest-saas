import bcrypt from 'bcryptjs';
import { pool } from '../../database/pool';
import { AppError } from '../../utils/errors';
import { signToken } from '../../utils/jwt';

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  role?: string;
}

export interface LoginResult {
  token: string;
  user: {
    id: number;
    email: string;
    fullName: string;
    role: string;
  };
}

export async function registerUser(input: RegisterInput): Promise<LoginResult> {
  const [existing]: any = await pool.query(
    'SELECT id FROM users WHERE email = ?',
    [input.email.toLowerCase()]
  );
  if (existing.length) throw new AppError(409, 'Email already registered');

  const hash = await bcrypt.hash(input.password, 12);
  const role = input.role || 'CUSTOMER';

  const [result]: any = await pool.query(
    'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
    [input.email.toLowerCase(), hash, input.fullName, role]
  );

  const userId = result.insertId;
  const token = signToken({ userId, email: input.email, role });

  return {
    token,
    user: {
      id: userId,
      email: input.email,
      fullName: input.fullName,
      role,
    },
  };
}

export async function loginUser(
  email: string,
  password: string
): Promise<LoginResult> {
  const [rows]: any = await pool.query(
    'SELECT id, email, password_hash, full_name, role, is_active FROM users WHERE email = ?',
    [email.toLowerCase()]
  );

  if (!rows.length) throw new AppError(401, 'Invalid credentials');

  const user = rows[0];
  if (!user.is_active) throw new AppError(403, 'Account is disabled');

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new AppError(401, 'Invalid credentials');

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
    },
  };
}