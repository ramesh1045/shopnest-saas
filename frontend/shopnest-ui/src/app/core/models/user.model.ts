export type UserRole =
  | 'SUPER_ADMIN'
  | 'STORE_OWNER'
  | 'STORE_MANAGER'
  | 'STORE_STAFF'
  | 'CUSTOMER';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  role?: 'CUSTOMER' | 'STORE_OWNER';
}