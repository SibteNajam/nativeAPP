import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { User } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/user.service';
import { BASE_OPTIONS, JWT_EXPIRY, JWT_REFRESH_EXPIRY, RefreshTokenPayload } from 'src/utils/jwtOptions';
import { RefreshTokenService } from './refreshToken.service';
import { RefreshToken } from './entities/refreshToken.entity';
import { JwtService } from '@nestjs/jwt';
import { SignOptions } from 'jsonwebtoken';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
const path = require('path');

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {
  }

  public async generateRefreshToken(user: User): Promise<string> {
    const token = await this.refreshTokenService.createRefreshToken(
      user,
      31556926,
    );
    const opts: SignOptions = {
      ...BASE_OPTIONS,
      expiresIn: JWT_REFRESH_EXPIRY,
      subject: String(user.id),
      jwtid: String(token.id),
    };
    return this.jwtService.signAsync({}, opts);
  }
  public async generateAccessToken(user: User): Promise<string> {
    const opts: SignOptions = {
      ...BASE_OPTIONS,
      subject: String(user.id),
      expiresIn: JWT_EXPIRY,
    };

    return this.jwtService.signAsync({}, opts);
  }

  async validateCredentials(user: User, password: string) {
    return this.userService.validateCredentials(user, password);
  }
  async findUserByEmail(email: string) {
    return this.userService.findUserByEmail(email);
  }

  async findById(id: string) {
    return await this.userService.findById(id);
  }

  /**
   * Revokes all refresh tokens for a user.
   * Used for logout functionality.
   */
  async revokeAllUserTokens(userId: string) {
    return this.refreshTokenService.revokeAllUserTokens(userId);
  }

  /**
   * Resolves and validates a refresh token JWT.
   * Returns the RefreshToken entity and User if valid.
   */
  public async resolveRefreshToken(encodedToken: string): Promise<{ user: User; token: RefreshToken }> {
    // Decode and verify the JWT
    const payload = await this.decodeRefreshToken(encodedToken);
    const token = await this.getStoredTokenFromRefreshTokenPayload(payload);

    if (!token) {
      throw new UnprocessableEntityException('Refresh token not found');
    }

    if (token.isRevoked) {
      throw new UnprocessableEntityException('Refresh token has been revoked');
    }

    if (token.tokenExpiry < new Date()) {
      throw new UnprocessableEntityException('Refresh token has expired');
    }

    const user = await this.getUserFromRefreshTokenPayload(payload);

    if (!user) {
      throw new UnprocessableEntityException('Refresh token malformed');
    }

    return { user, token };
  }

  /**
   * Creates a new access token and refresh token pair from a valid refresh token.
   * Implements refresh token rotation by revoking the old token.
   */
  public async createAccessTokenFromRefreshToken(
    encodedToken: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    const { user, token } = await this.resolveRefreshToken(encodedToken);

    // Revoke the old refresh token (token rotation for security)
    await this.refreshTokenService.revokeToken(token.id);

    // Generate new tokens
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    return { accessToken, refreshToken, user };
  }

  /**
   * Decodes and verifies a refresh token JWT
   */
  private async decodeRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      return await this.jwtService.verifyAsync(token);
    } catch (e) {
      if (e?.name === 'TokenExpiredError') {
        throw new UnprocessableEntityException('Refresh token has expired');
      }
      throw new UnprocessableEntityException('Invalid refresh token');
    }
  }

  /**
   * Gets the stored RefreshToken entity from the JWT payload
   */
  private async getStoredTokenFromRefreshTokenPayload(
    payload: RefreshTokenPayload,
  ): Promise<RefreshToken | null> {
    const tokenId = payload.jti;

    if (!tokenId) {
      throw new UnprocessableEntityException('Refresh token malformed');
    }

    return this.refreshTokenService.findTokenById(tokenId);
  }

  /**
   * Gets the User from the refresh token JWT payload
   */
  private async getUserFromRefreshTokenPayload(
    payload: RefreshTokenPayload,
  ): Promise<User | null> {
    const userId = payload.sub;

    if (!userId) {
      throw new UnprocessableEntityException('Refresh token malformed');
    }

    return this.userService.findById(userId);
  }
}

