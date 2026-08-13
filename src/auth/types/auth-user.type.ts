import { Role } from '../../shared/enums/role.enum';

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  role: Role;
  avatar: string | null;
}
