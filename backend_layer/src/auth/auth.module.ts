import { UserModule } from './../user/user.module';
import { User } from 'src/user/entities/user.entity';
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OPTIONS } from 'src/utils/jwtOptions';
import { RefreshToken } from './entities/refreshToken.entity';
import { BiometricDevice } from './entities/biometric-device.entity';
import { RefreshTokenService } from './refreshToken.service';
import { BiometricService } from './biometric.service';
import { JwtStrategy } from './strategy/jwt.strategy';
import { JWTGuard } from 'src/guards/jwt.guard';
import { ApicredentialsModule } from 'src/apicredentials/apicredentials.module';
import { EmailModule } from 'src/email/email.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshToken, User, BiometricDevice]),
    PassportModule,
    JwtModule.register(OPTIONS),
    UserModule,
    ApicredentialsModule,  // Added for configured exchanges
    EmailModule,  // Added for login notifications
  ],
  controllers: [AuthController],
  providers: [AuthService, RefreshTokenService, BiometricService, JwtStrategy, JWTGuard ],
})
export class AuthModule {}
