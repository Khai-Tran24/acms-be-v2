import { Role } from 'src/shared/enums/role.enum';

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  role: Role;
}
