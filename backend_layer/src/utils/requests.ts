
import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, MinLength } from "class-validator";


export class LoginRequest {
  @ApiProperty()
  @IsNotEmpty({ message: 'An email is required' })
  readonly email: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'A password is required to login' })
  readonly password: string;

}

export class RegisterUserRequest {
  @ApiProperty()
  readonly displayName: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'An email is required' })
  readonly email: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'A password is required' })
  @MinLength(6, { message: 'Your password must be at least 6 characters' })
  readonly password: string;
  @ApiProperty()
  @IsNotEmpty({ message: 'A password is required' })
  @MinLength(6, { message: 'Your confirm password must be at least 6 characters' })
  readonly confirmPassword: string;

}