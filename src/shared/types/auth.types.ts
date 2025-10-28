import { Profile, Role } from './database.types';

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthState {
  user: AuthUser | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  login: string;
  password: string;
}
