import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse
} from '@nestjs/swagger';
import { Public } from 'src/decorators/isPublic';
import { RegisterUserRequest } from 'src/utils/requests';

@ApiBearerAuth('Authorization')
@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }


  @Public()
  @Post('register-user')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterUserRequest })
  @ApiCreatedResponse({
    description: 'User successfully registered',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'Success' },
        data: { type: 'object' },
        statusCode: { type: 'number', example: 201 },
        message: { type: 'string', example: 'User registered successfully' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data' })
  @ApiResponse({ status: 409, description: 'Conflict - User already exists' })
  registerUser(@Body() createUserDto: RegisterUserRequest) {
    console.log('User registration hit'); // for debugging
    return this.userService.createUser(createUserDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiOkResponse({
    description: 'List of all users retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'Success' },
        data: { type: 'array', items: { type: 'object' } },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Users retrieved successfully' }
      }
    }
  })
  findAll() {
    return this.userService.findAll();
  }
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', type: 'string' })
  @ApiOkResponse({
    description: 'User retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'Success' },
        data: { type: 'object' },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'User retrieved successfully' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Public()
  @Patch(':id')
  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', type: 'string' })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({
    description: 'User updated successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'Success' },
        data: { type: 'object' },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'User updated successfully' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Public()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', type: 'string' })
  @ApiNoContentResponse({ description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  // ================================================================
  // OTP Verification Endpoints
  // ================================================================

  @Public()
  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify email with OTP code' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        otp: { type: 'string', example: '123456' },
      },
      required: ['email', 'otp'],
    },
  })
  @ApiOkResponse({
    description: 'Email verified successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'Success' },
        message: { type: 'string', example: 'Email verified successfully!' },
        statusCode: { type: 'number', example: 200 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyOTP(@Body() body: { email: string; otp: string }) {
    console.log('OTP verification request for:', body.email);
    return this.userService.verifyOTP(body.email, body.otp);
  }

  @Public()
  @Post('resend-otp')
  @ApiOperation({ summary: 'Resend OTP code to email' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
      },
      required: ['email'],
    },
  })
  @ApiOkResponse({
    description: 'OTP resent successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'Success' },
        message: { type: 'string', example: 'New OTP sent to your email.' },
        statusCode: { type: 'number', example: 200 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'User not found' })
  async resendOTP(@Body() body: { email: string }) {
    console.log('OTP resend request for:', body.email);
    return this.userService.resendOTP(body.email);
  }
}
