import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { RefreshToken } from './entities/refreshToken.entity';
import { User } from 'src/user/entities/user.entity';
import { BiometricDevice } from './entities/biometric-device.entity';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshToken: Repository<RefreshToken>,
    @InjectRepository(BiometricDevice)
    private readonly biometricDevice: Repository<BiometricDevice>,
  ) { }

  /**
   * Create a refresh token record.
   * @param user The owning user
   * @param ttl Seconds until expiration (passed in seconds). This will be converted to milliseconds.
   */
  async createRefreshToken(user: User, ttl: number): Promise<RefreshToken> {
    const refreshToken = new RefreshToken();
    refreshToken.user = user;
    refreshToken.isRevoked = false;
    const expiration = new Date();
    // Treat ttl as seconds (caller provides seconds) and convert to milliseconds
    expiration.setTime(expiration.getTime() + ttl * 1000);
    refreshToken.tokenExpiry = expiration;
    return await this.refreshToken.save(refreshToken);
  }

  async findTokenById(id: string) {
    return await this.refreshToken.findOne({
      where: {
        id,
        isRevoked: false,
      },
      relations: ['user'],
    });
  }
  async deleteByUserId(id: string) {
    return await this.refreshToken.delete({ user: { id: id } });
  }

  /**
   * Revokes a refresh token by marking it as revoked.
   * Used during token rotation to invalidate the old token.
   */
  async revokeToken(id: string) {
    return await this.refreshToken.update(id, { isRevoked: true });
  }

  /**
   * Revokes all refresh tokens for a user.
   * Useful for logout-all-devices functionality.
   * @param userId The user ID
   * @param excludeBiometric If true, don't revoke biometric device tokens
   */
  async revokeAllUserTokens(userId: string, excludeBiometric: boolean = true) {
    if (excludeBiometric) {
      // Get all biometric device refresh token IDs for this user
      const biometricDevices = await this.biometricDevice.find({
        where: { userId, isRevoked: false },
        select: ['refreshTokenId'],
      });
      
      const biometricTokenIds = biometricDevices
        .map(d => d.refreshTokenId)
        .filter(id => id != null);
      
      if (biometricTokenIds.length > 0) {
        // Revoke all tokens EXCEPT biometric device tokens
        return await this.refreshToken.update(
          { 
            user: { id: userId },
            id: Not(In(biometricTokenIds))
          },
          { isRevoked: true }
        );
      }
    }
    
    // Fallback: revoke all tokens
    return await this.refreshToken.update(
      { user: { id: userId } },
      { isRevoked: true }
    );
  }
}
