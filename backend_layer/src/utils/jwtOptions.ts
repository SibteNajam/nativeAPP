import { JwtModuleOptions, JwtSignOptions } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import crypto from 'crypto';

ConfigModule.forRoot();

// Generate a secure random secret if not in .env
// ⚠️ In production, always set JWT_TOKEN_SECRET in .env
const JWT_TOKEN_SECRET_ENV = process.env.JWT_TOKEN_SECRET;
const JWT_SECRET = JWT_TOKEN_SECRET_ENV ||
  (() => {
    const secret = crypto.randomBytes(64).toString('hex');
    console.warn('⚠️  JWT_TOKEN_SECRET not set in .env - using generated secret (development only)');
    return secret;
  })();

const rawExpiry = process.env.ACCESS_TOKEN_EXPIRATION;
const rawRefreshExpiry = process.env.REFRESH_TOKEN_EXPIRATION;

function parseDuration(raw: string | undefined, defaultSeconds: number): number {
  if (!raw) return defaultSeconds;
  // Plain number -> treated as seconds
  if (!isNaN(Number(raw))) return Number(raw);
  // Support simple suffixes: s, m, h, d (seconds, minutes, hours, days)
  const m = raw.match(/^(\d+)([smhd])$/i);
  if (m) {
    const v = Number(m[1]);
    const unit = m[2].toLowerCase();
    switch (unit) {
      case 's': return v;
      case 'm': return v * 60;
      case 'h': return v * 3600;
      case 'd': return v * 86400;
    }
  }
  // Fallback to default if unparsable
  return defaultSeconds;
}

const JWT_EXPIRY: number = parseDuration(rawExpiry, 604800); // default 7days
const JWT_REFRESH_EXPIRY: number = parseDuration(rawRefreshExpiry, 1209600); // default 14 days

console.log(`[JWT_DEBUG] Secret Length: ${JWT_SECRET?.length || 0}`);
console.log(`[JWT_DEBUG] Expiry (s): ${JWT_EXPIRY} (Raw: "${rawExpiry}")`);
console.log(`[JWT_DEBUG] Refresh Expiry (s): ${JWT_REFRESH_EXPIRY} (Raw: "${rawRefreshExpiry}")`);

const BASE_OPTIONS: JwtSignOptions = {
  issuer: 'https://ai.com',
  audience: 'https://ai.com',
};

interface RefreshTokenPayload {
  jti: string;
  sub: string;
}

const OPTIONS: JwtModuleOptions = {
  secret: JWT_SECRET,
  signOptions: {
    ...BASE_OPTIONS,
    expiresIn: JWT_EXPIRY as any,
  },
};

export {
  BASE_OPTIONS,
  OPTIONS,
  JWT_SECRET,
  JWT_EXPIRY,
  JWT_REFRESH_EXPIRY,
  type RefreshTokenPayload,
};
