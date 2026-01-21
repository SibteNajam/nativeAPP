/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { randomStr } from 'src/utils/utilities';
import { SignOptions, TokenExpiredError } from 'jsonwebtoken';
import { BASE_OPTIONS, JWT_EXPIRY, JWT_REFRESH_EXPIRY, RefreshTokenPayload } from 'src/utils/jwtOptions';
import { JwtService } from '@nestjs/jwt';
import { RegisterUserRequest } from 'src/utils/requests';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {
  }

  /**
   * Generate a 6-digit OTP code
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  async createUser(createUserDto: RegisterUserRequest) {
    const foundUser = await this.userRepository.findOne({
      where: { email: createUserDto.email, isDeleted: false },
    });
    let user;
    if (foundUser) {
      throw new UnprocessableEntityException({
        status: 'Fail',
        data: {},
        statusCode: 422,
        message: 'User already exists with this email.'
      });
    } else {
      user = new User();
    }
    if (createUserDto.password !== createUserDto.confirmPassword) {
      throw new UnprocessableEntityException({
        status: 'Fail',
        statusCode: 422,
        message: 'Passwords do not match.',
        data: {},
      });
    }
    user.name = createUserDto.displayName;
    user.email = createUserDto.email;
    user.secretToken = randomStr();
    user.secretTokenCreatedAt = new Date();
    user.isVerified = false; // User must verify via OTP
    user.password = await bcrypt.hashSync(createUserDto.password, 10);

    // Generate OTP for email verification
    const otpCode = this.generateOTP();
    user.otpCode = otpCode;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.otpAttempts = 0;

    this.validateUser(user);
    const createdUser = await this.userRepository.save(user);

    // Send OTP email
    const emailSent = await this.emailService.sendOTPEmail(
      createdUser.email,
      otpCode,
      createdUser.name
    );

    if (!emailSent) {
      this.logger.warn(`⚠️ Failed to send OTP email to ${createdUser.email}, but user was created`);
    } else {
      this.logger.log(`✅ OTP sent to ${createdUser.email}`);
    }
    if (!createdUser) {
      throw new UnprocessableEntityException(
        {
          status: 'Fail',
          data: {},
          statusCode: 422,
          message: 'Unable to create user. Please try again.'

        }
      );
    }
    return {
      status: 'Success',
      data: {
        user: {
          id: createdUser.id,
          email: createdUser.email,
          displayName: createdUser.name,
          createdAt: createdUser.createdAt.toISOString(),
        },
        requiresVerification: true,
      },
      statusCode: 201,
      message: 'User created successfully. Please verify your email with the OTP sent to your inbox.'
    };
  }

  /**
   * Verify OTP code for email verification
   */
  async verifyOTP(email: string, otpCode: string): Promise<{ status: string; message: string; statusCode: number }> {
    const user = await this.userRepository.findOne({
      where: { email, isDeleted: false },
    });

    if (!user) {
      throw new BadRequestException({
        status: 'Fail',
        data: {},
        statusCode: 400,
        message: 'User not found.',
      });
    }

    if (user.isVerified) {
      return {
        status: 'Success',
        message: 'Email already verified. You can login now.',
        statusCode: 200,
      };
    }

    // Check if OTP has expired
    if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      throw new BadRequestException({
        status: 'Fail',
        data: { expired: true },
        statusCode: 400,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    // Check attempts (max 5)
    if (user.otpAttempts >= 5) {
      throw new BadRequestException({
        status: 'Fail',
        data: { tooManyAttempts: true },
        statusCode: 400,
        message: 'Too many failed attempts. Please request a new OTP.',
      });
    }

    // Verify OTP
    if (user.otpCode !== otpCode) {
      // Increment attempts
      await this.userRepository.update(user.id, {
        otpAttempts: user.otpAttempts + 1,
      });

      const remainingAttempts = 5 - (user.otpAttempts + 1);
      throw new BadRequestException({
        status: 'Fail',
        data: { remainingAttempts },
        statusCode: 400,
        message: `Invalid OTP. ${remainingAttempts} attempts remaining.`,
      });
    }

    // OTP is valid - verify user
    await this.userRepository.update(user.id, {
      isVerified: true,
      otpCode: undefined as any, // Clear OTP
      otpExpiresAt: undefined as any, // Clear expiry
      otpAttempts: 0,
    });

    this.logger.log(`✅ User ${email} verified successfully`);

    return {
      status: 'Success',
      message: 'Email verified successfully! You can now login.',
      statusCode: 200,
    };
  }

  /**
   * Resend OTP code to user's email
   */
  async resendOTP(email: string): Promise<{ status: string; message: string; statusCode: number }> {
    const user = await this.userRepository.findOne({
      where: { email, isDeleted: false },
    });

    if (!user) {
      throw new BadRequestException({
        status: 'Fail',
        data: {},
        statusCode: 400,
        message: 'User not found.',
      });
    }

    if (user.isVerified) {
      return {
        status: 'Success',
        message: 'Email already verified. You can login now.',
        statusCode: 200,
      };
    }

    // Generate new OTP
    const otpCode = this.generateOTP();

    await this.userRepository.update(user.id, {
      otpCode: otpCode,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      otpAttempts: 0,
    });

    // Send OTP email
    const emailSent = await this.emailService.sendOTPEmail(
      email,
      otpCode,
      user.name
    );

    if (!emailSent) {
      throw new UnprocessableEntityException({
        status: 'Fail',
        data: {},
        statusCode: 422,
        message: 'Failed to send OTP email. Please try again.',
      });
    }

    this.logger.log(`✅ OTP resent to ${email}`);

    return {
      status: 'Success',
      message: 'New OTP sent to your email.',
      statusCode: 200,
    };
  }
  async findAll() {
    const users = await this.userRepository.find({
      where: { isDeleted: false },
      select: ['id', 'email', 'name',],
    });

    // to match frontend datatype
    const transformedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      displayName: user.name,
    }));

    return {
      status: 'Success',
      data: { users: transformedUsers },
      statusCode: 200,
      message: 'Users retrieved successfully'
    };
  }
  async findById(id: string) {
    const user = await this.userRepository.findOne({
      where: {
        id,
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }
    return user;
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
    });
    if (!user) {
      throw new UnauthorizedException({
        status: 'Fail',
        data: {},
        statusCode: 401,
        message: 'Unauthorized'
      });
    }
    return {
      status: 'Success',
      data: { data: user },
      statusCode: 200,
      message: 'User detail'
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.userRepository.update(id, updateUserDto);
    let user = await this.userRepository.findOne({ where: { id: id } });
    return {
      status: 'Success',
      data: { data: { user: user } },
      statusCode: 200,
      message: 'User detail'
    };
  }

  async findUserByEmail(email: string) {
    const user = await this.userRepository.findOne({
      where: {
        email,

      },
    });
    if (user) {
      return user;
    } else {
      throw new BadRequestException({
        status: 'Fail',
        data: {},
        statusCode: 400,
        message: 'Invalid credentials.'
      });
    }
  }

  async validateCredentials(user: User, password: string) {
    return await bcrypt.compare(password, user.password);
  }

  private checkPassword(password: string) {
    if (!password) {
      throw new UnprocessableEntityException({
        status: 'Fail',
        data: {},
        statusCode: 422,
        message: 'Password is required.'
      });
    }
    // if (
    //   password.length < 6 &&
    //   !/^(?=.*[0-9])(?=.*[A-Za-z])[\w\W]{6,16}$/.test(password)
    // ) {
    //   throw new UnprocessableEntityException(
    //     'Password should be more than 6 characters and should have letters and numbers.',
    //   );
    // }
  }
  private async createHash(password: string) {
    return await bcrypt.hashSync(password, 10);
  }

  async remove(id: string) {
    let user = await this.userRepository.findOne({
      where: {
        id: id
      },
    });
    if (user) {
      //add here
      await this.userRepository.update(id, { isDeleted: true });
      return {
        status: 'Success',
        data: { data: "User Deleted" },
        statusCode: 200,
        message: 'User'
      };
    } else {
      throw new BadRequestException({
        status: 'Fail',
        data: {},
        statusCode: 401,
        message: 'User not found'
      });
    }

  }


  validateUser(user: User) {

    if (!user.email) {
      throw new UnprocessableEntityException('Email is required.');
    }
    if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(user.email)) {
      throw new UnprocessableEntityException(
        {
          status: 'Fail',
          data: {},
          statusCode: 422,
          message: 'A valid email address is required.'
        }
      );
    }
    this.checkPassword(user.password);
  }
  buildResponsePayload(user: User, accessToken: string, refreshToken?: string) {
    return {
      user: user,
      payload: {
        type: 'bearer',
        token: accessToken,
        ...(refreshToken ? { refresh_token: refreshToken } : {}),
      },
    };
  }
}