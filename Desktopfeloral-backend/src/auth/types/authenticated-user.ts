import type { UserRole } from '../constants/roles';

export interface AuthenticatedUser {
  id: number;
  fullName: string | null;
  mobile: string;
  email: string | null;
  role: UserRole;
  sessionId: string;
}
