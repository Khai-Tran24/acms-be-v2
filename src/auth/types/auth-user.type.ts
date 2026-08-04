export interface AuthUser {
  id: number;
  email: string;
  username: string;
  role: string | null;
  permissions: string[];
}
