import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { ApiCredential, ExchangeType } from './entities/api-credential.entity';
import { CreateCredentialDto, UpdateCredentialDto, DecryptedCredentialDto } from './dto';

@Injectable()
export class ApicredentialsService {
  private readonly logger = new Logger(ApicredentialsService.name);
  private readonly algorithm = 'aes-256-cbc';
  private readonly encryptionKey: Buffer;
  private readonly iv: Buffer;

  constructor(
    @InjectRepository(ApiCredential)
    private readonly credentialRepository: Repository<ApiCredential>,
    private readonly configService: ConfigService,
  ) {
    // Get encryption key from env or generate one (MUST be 32 bytes for aes-256)
    const key = this.configService.get<string>('CREDENTIAL_ENCRYPTION_KEY') || 'default-32-byte-encryption-key!!';
    this.encryptionKey = Buffer.from(key.padEnd(32, '0').slice(0, 32));

    // IV (initialization vector) - for production, store per-credential or derive from key
    const ivKey = this.configService.get<string>('CREDENTIAL_IV_KEY') || 'default-16-byte!';
    this.iv = Buffer.from(ivKey.padEnd(16, '0').slice(0, 16));
  }

  /**
   * Encrypt sensitive data
   */
  private encrypt(text: string): string {
    try {
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, this.iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new InternalServerErrorException('Failed to encrypt credentials');
    }
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(encryptedText: string): string {
    try {
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, this.iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed', error);
      throw new InternalServerErrorException('Failed to decrypt credentials');
    }
  }

  /**
   * Preview decryption of a string (Public helper)
   */
  previewDecryption(encryptedText: string): string {
    return this.decrypt(encryptedText);
  }

  /**
   * Preview encryption of a string (Public helper)
   */
  previewEncryption(text: string): string {
    return this.encrypt(text);
  }



  /**
   * Create new credential for user, or update if already exists
   */
  async create(userId: string, createDto: CreateCredentialDto): Promise<ApiCredential> {
    // Check if credential already exists for this user and exchange
    const existing = await this.credentialRepository.findOne({
      where: { userId, exchange: createDto.exchange },
    });

    if (existing) {
      // Update existing credential instead of throwing error
      this.logger.log(`Updating existing credential for user ${userId}, exchange ${createDto.exchange}`);

      existing.apiKey = this.encrypt(createDto.apiKey);
      existing.secretKey = this.encrypt(createDto.secretKey);
      existing.passphrase = createDto.passphrase ? this.encrypt(createDto.passphrase) : null;
      existing.label = createDto.label;
      existing.isActive = true; // Reactivate if it was disabled
      existing.activeTrading = createDto.activeTrading ?? existing.activeTrading;
      existing.updatedAt = new Date();

      const updated = await this.credentialRepository.save(existing);
      this.logger.log(`Credential updated for user ${userId}, exchange ${createDto.exchange}`);

      return updated;
    }

    // Create new credential if it doesn't exist
    const credential = this.credentialRepository.create({
      userId,
      exchange: createDto.exchange,
      apiKey: this.encrypt(createDto.apiKey),
      secretKey: this.encrypt(createDto.secretKey),
      passphrase: createDto.passphrase ? this.encrypt(createDto.passphrase) : null,
      label: createDto.label,
      isActive: true,
      activeTrading: createDto.activeTrading ?? true, // Default to true so trading works immediately
    });

    const saved = await this.credentialRepository.save(credential);
    this.logger.log(`Credential created for user ${userId}, exchange ${createDto.exchange}`);

    return saved;
  }

  /**
   * Get all credentials for a user (without decrypted keys)
   */
  async findAllByUser(userId: string): Promise<ApiCredential[]> {
    return this.credentialRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get specific credential by ID (without decrypted keys)
   */
  async findOne(userId: string, credentialId: string): Promise<ApiCredential> {
    const credential = await this.credentialRepository.findOne({
      where: { id: credentialId, userId },
    });

    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    return credential;
  }

  /**
   * Get decrypted credential for making API calls
   * This is the key method that exchange controllers will use
   */
  async getUserCredential(
    userId: string,
    exchange: ExchangeType,
  ): Promise<DecryptedCredentialDto | null> {
    this.logger.log(`[DEBUG] getUserCredential called - userId: ${userId}, exchange: ${exchange}`);

    const credential = await this.credentialRepository.findOne({
      where: { userId, exchange, isActive: true },
    });

    this.logger.log(`[DEBUG] Database query result - Found: ${!!credential}, ID: ${credential?.id}`);

    if (!credential) {
      this.logger.log(`[DEBUG] No credential found in database for userId ${userId}, exchange ${exchange}`);
      return null;
    }

    this.logger.log(`[DEBUG] Attempting to decrypt credential ID: ${credential.id}`);

    try {
      const decrypted = {
        apiKey: this.decrypt(credential.apiKey),
        secretKey: this.decrypt(credential.secretKey),
        passphrase: credential.passphrase ? this.decrypt(credential.passphrase) : undefined,
      };
      this.logger.log(`[DEBUG] Decryption successful for credential ID: ${credential.id}`);
      this.logger.log(`[DEBUG] Decrypted API Key (first 10 chars): ${decrypted.apiKey?.substring(0, 10)}...`);
      this.logger.log(`[DEBUG] Decrypted Secret Key (first 10 chars): ${decrypted.secretKey?.substring(0, 10)}...`);
      return decrypted;
    } catch (error) {
      this.logger.error(`[DEBUG] Decryption failed for credential ID: ${credential.id}`, error.message);
      throw error;
    }
  }

  /**
   * Update credential
   */
  async update(
    userId: string,
    credentialId: string,
    updateDto: UpdateCredentialDto,
  ): Promise<ApiCredential> {
    const credential = await this.findOne(userId, credentialId);

    // Update fields if provided
    if (updateDto.apiKey) {
      credential.apiKey = this.encrypt(updateDto.apiKey);
    }
    if (updateDto.secretKey) {
      credential.secretKey = this.encrypt(updateDto.secretKey);
    }
    if (updateDto.passphrase !== undefined) {
      credential.passphrase = updateDto.passphrase ? this.encrypt(updateDto.passphrase) : null;
    }
    if (updateDto.isActive !== undefined) {
      credential.isActive = updateDto.isActive;
    }
    if (updateDto.label !== undefined) {
      credential.label = updateDto.label;
    }
    if (updateDto.activeTrading !== undefined) {
      credential.activeTrading = updateDto.activeTrading;
    }

    const updated = await this.credentialRepository.save(credential);
    this.logger.log(`Credential ${credentialId} updated for user ${userId}`);

    return updated;
  }

  /**
   * Delete credential
   */
  async remove(userId: string, credentialId: string): Promise<void> {
    const credential = await this.findOne(userId, credentialId);
    await this.credentialRepository.remove(credential);
    this.logger.log(`Credential ${credentialId} deleted for user ${userId}`);
  }

  /**
   * Toggle active status
   */
  async toggleActive(userId: string, credentialId: string): Promise<ApiCredential> {
    const credential = await this.findOne(userId, credentialId);
    credential.isActive = !credential.isActive;
    return this.credentialRepository.save(credential);
  }

  /**
   * Get list of exchanges configured by user (safe - no sensitive data)
   */
  async getUserExchanges(userId: string): Promise<string[]> {
    const credentials = await this.credentialRepository.find({
      where: { userId: userId, isActive: true },
      select: ['exchange']  // Only get exchange names, no sensitive data
    });

    return credentials.map(c => c.exchange);
  }

  /**
   * Get all credentials marked for active trading (for WebSocket order monitoring)
   * Returns decrypted credentials for all users with activeTrading enabled
   */
  async getActiveTradingCredentials(): Promise<Array<{
    userId: string;
    exchange: ExchangeType;
    apiKey: string;
    secretKey: string;
    passphrase?: string;
  }>> {
    const credentials = await this.credentialRepository.find({
      where: { isActive: true, activeTrading: true },
    });

    return credentials.map(c => ({
      userId: c.userId,
      exchange: c.exchange,
      apiKey: this.decrypt(c.apiKey),
      secretKey: this.decrypt(c.secretKey),
      passphrase: c.passphrase ? this.decrypt(c.passphrase) : undefined,
    }));
  }

  /**
   * Get active trading credential for a specific user and exchange
   */
  async getActiveTradingCredential(
    userId: string,
    exchange: ExchangeType,
  ): Promise<DecryptedCredentialDto | null> {
    const credential = await this.credentialRepository.findOne({
      where: { userId, exchange, isActive: true, activeTrading: true },
    });

    if (!credential) {
      return null;
    }

    return {
      apiKey: this.decrypt(credential.apiKey),
      secretKey: this.decrypt(credential.secretKey),
      passphrase: credential.passphrase ? this.decrypt(credential.passphrase) : undefined,
    };
  }
}
