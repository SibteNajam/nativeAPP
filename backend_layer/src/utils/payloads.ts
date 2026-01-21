import { User } from 'src/user/entities/user.entity';

interface AuthenticationPayload {
  user: User;
  payload: {
    type: string;
    token: string;
    refresh_token?: string;
  };
}

interface AccessTokenPayload {
  sub: string;
}

export type { AuthenticationPayload, AccessTokenPayload };
