import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ApicredentialsService } from './apicredentials.service';
import { CreateCredentialDto, UpdateCredentialDto, CredentialResponseDto, DecryptPreviewDto, EncryptPreviewDto } from './dto';
import { JWTGuard } from '../guards/jwt.guard';
import { Public } from 'src/decorators/isPublic';


@ApiTags('API Credentials')
@Controller('api-credentials')
@UseGuards(JWTGuard) // Re-enabled JWT authentication
@ApiBearerAuth('Authorization')
export class ApicredentialsController {
  constructor(private readonly credentialsService: ApicredentialsService) { }

  @Public()
  @Post('decrypt-preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview decrypted value',
    description: 'Decrypts an encrypted string using the server encryption key. Public endpoint for testing.',
  })
  @ApiResponse({
    status: 200,
    description: 'Decryption successful',
    schema: {
      type: 'object',
      properties: {
        original: { type: 'string' },
        decrypted: { type: 'string' },
      },
    },
  })
  decryptPreview(@Body() dto: DecryptPreviewDto) {
    const decrypted = this.credentialsService.previewDecryption(dto.encryptedText);
    return {
      original: dto.encryptedText,
      decrypted: decrypted,
    };
  }

  @Public()
  @Post('encrypt-preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview encrypted value',
    description: 'Encrypts a plain string using the server encryption key. Public endpoint for testing.',
  })
  @ApiResponse({
    status: 200,
    description: 'Encryption successful',
    schema: {
      type: 'object',
      properties: {
        original: { type: 'string' },
        encrypted: { type: 'string' },
      },
    },
  })
  encryptPreview(@Body() dto: EncryptPreviewDto) {
    const encrypted = this.credentialsService.previewEncryption(dto.plainText);
    return {
      original: dto.plainText,
      encrypted: encrypted,
    };
  }


  @Post('save-credentials')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Store or update exchange credentials',
    description: 'Store API keys and secrets for an exchange. If credentials already exist, they will be updated. Keys are encrypted before storage.',
  })
  @ApiResponse({
    status: 201,
    description: 'Credentials stored or updated successfully',
    type: CredentialResponseDto,
  })
  async create(@Req() req, @Body() createDto: CreateCredentialDto) {
    console.log("request", req, "body...", createDto);
    const userId = req.user.id; // Use authenticated user ID from JWT
    const credential = await this.credentialsService.create(userId, createDto);

    // Return only safe fields (no encrypted keys)
    return {
      status: 'Success',
      statusCode: 201,
      message: 'Credentials stored or updated successfully',
      data: {
        id: credential.id,
        exchange: credential.exchange,
        isActive: credential.isActive,
        activeTrading: credential.activeTrading,
        label: credential.label,
        createdAt: credential.createdAt,
        updatedAt: credential.updatedAt,
      },
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all user credentials',
    description: 'Retrieve all stored exchange credentials for the authenticated user (keys are not returned)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of credentials',
    type: [CredentialResponseDto],
  })
  async findAll(@Req() req) {
    const userId = req.user.id; // Use authenticated user ID from JWT
    const credentials = await this.credentialsService.findAllByUser(userId);

    return {
      status: 'Success',
      statusCode: 200,
      message: 'Credentials retrieved successfully',
      data: credentials.map((c) => ({
        id: c.id,
        exchange: c.exchange,
        isActive: c.isActive,
        activeTrading: c.activeTrading,
        label: c.label,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get specific credential',
    description: 'Retrieve a specific credential by ID',
  })
  @ApiParam({ name: 'id', description: 'Credential UUID' })
  @ApiResponse({ status: 200, description: 'Credential found', type: CredentialResponseDto })
  @ApiResponse({ status: 404, description: 'Credential not found' })
  async findOne(@Req() req, @Param('id') id: string) {
    const userId = req.user.id; // Use authenticated user ID from JWT
    const credential = await this.credentialsService.findOne(userId, id);

    return {
      status: 'Success',
      statusCode: 200,
      data: {
        id: credential.id,
        exchange: credential.exchange,
        isActive: credential.isActive,
        activeTrading: credential.activeTrading,
        label: credential.label,
        createdAt: credential.createdAt,
        updatedAt: credential.updatedAt,
      },
    };
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update credential',
    description: 'Update API keys, label, or active status',
  })
  @ApiParam({ name: 'id', description: 'Credential UUID' })
  @ApiResponse({ status: 200, description: 'Credential updated', type: CredentialResponseDto })
  @ApiResponse({ status: 404, description: 'Credential not found' })
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateCredentialDto,
  ) {
    const userId = req.user.id; // Use authenticated user ID from JWT
    const credential = await this.credentialsService.update(userId, id, updateDto);

    return {
      status: 'Success',
      statusCode: 200,
      message: 'Credential updated successfully',
      data: {
        id: credential.id,
        exchange: credential.exchange,
        isActive: credential.isActive,
        activeTrading: credential.activeTrading,
        label: credential.label,
        updatedAt: credential.updatedAt,
      },
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete credential',
    description: 'Permanently delete stored credentials',
  })
  @ApiParam({ name: 'id', description: 'Credential UUID' })
  @ApiResponse({ status: 204, description: 'Credential deleted' })
  @ApiResponse({ status: 404, description: 'Credential not found' })
  async remove(@Req() req, @Param('id') id: string) {
    const userId = req.user.id; // Use authenticated user ID from JWT
    await this.credentialsService.remove(userId, id);
  }

  @Patch(':id/toggle')
  @ApiOperation({
    summary: 'Toggle credential active status',
    description: 'Enable or disable a credential',
  })
  @ApiParam({ name: 'id', description: 'Credential UUID' })
  @ApiResponse({ status: 200, description: 'Status toggled', type: CredentialResponseDto })
  async toggleActive(@Req() req, @Param('id') id: string) {
    const userId = req.user.id; // Use authenticated user ID from JWT
    const credential = await this.credentialsService.toggleActive(userId, id);

    return {
      status: 'Success',
      statusCode: 200,
      message: `Credential ${credential.isActive ? 'activated' : 'deactivated'}`,
      data: {
        id: credential.id,
        exchange: credential.exchange,
        isActive: credential.isActive,
        activeTrading: credential.activeTrading,
        updatedAt: credential.updatedAt,
      },
    };
  }
}
// when i maker equest form front end i got this in terminal
// slashes: null,
//     auth: null,
//     host: null,
//     port: null,
//     hostname: null,
//     hash: null,
//     search: null,
//     query: null,
//     pathname: '/api-credentials',
//     path: '/api-credentials',
//     href: '/api-credentials',
//     _raw: '/api-credentials'
//   },
//   params: [Object: null prototype] {},
//   body: {
//     exchange: 'BINANCE',
//     apiKey: '123456789',
//     secretKey: '123456789',
//     label: 'byteboom'
//   },
//   length: undefined,
//   _eventsCount: 0,
//   route: Route {
//     path: '/api-credentials',
//     stack: [ [Layer] ],
//     methods: [Object: null prototype] { post: true }
//   },
//   [Symbol(shapeMode)]: true,
//   [Symbol(kCapture)]: false,
//   [Symbol(kHeaders)]: {
//     host: 'localhost:3000',
//     connection: 'keep-alive',
//     'content-length': '86',
//     'sec-ch-ua-platform': '"Windows"',
//     authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjI4MzgwNjQsImV4cCI6MTc2Mjg0MTY2NCwiYXVkIjoiaHR0cHM6Ly9haS5jb20iLCJpc3MiOiJodHRwczovL2FpLmNvbSIsInN1YiI6IjAzYTRlODZkLTIwNTktNDAzMi1hMDUyLTlhZDMyZWNiNmJiOCJ9.x3sDhrfSgURv2fSd0sHQreGr0h3fk43GDMUHn2qYUjQ',
//     'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
//     'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
//     'content-type': 'application/json',
//     'sec-ch-ua-mobile': '?0',
//     accept: '*/*',
//     origin: 'http://localhost:3002',
//     'sec-fetch-site': 'same-site',
//     'sec-fetch-mode': 'cors',
//     'sec-fetch-dest': 'empty',
//     referer: 'http://localhost:3002/',
//     'accept-encoding': 'gzip, deflate, br, zstd',
//     'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8'
//   },
//   [Symbol(kHeadersCount)]: 34,
//   [Symbol(kTrailers)]: null,
//   [Symbol(kTrailersCount)]: 0
// } body... {
//   exchange: 'BINANCE',
//   apiKey: '123456789',
//   secretKey: '123456789',
//   label: 'byteboom'
// }
// [Nest] 20156  - 11/11/2025, 10:40:43 AM   ERROR [ExceptionsHandler] TypeError: Cannot read properties of undefined (reading 'id')
//     at ApicredentialsController.create (D:\ByteBoom\REPO\backend\src\apicredentials\apicredentials.controller.ts:48:29)
//     at D:\ByteBoom\REPO\backend\node_modules\@nestjs\core\router\router-execution-context.js:38:29
//     at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
//     at async D:\ByteBoom\REPO\backend\node_modules\@nestjs\core\router\router-execution-context.js:46:28
//     at async D:\ByteBoom\REPO\backend\node_modules\@nestjs\core\router\router-proxy.js:9:17
// [
//   -7.85864,
//   -18.92069,
//   -39.59304,
//   -53.766960000000005,
//   -43.55767,
//   -35.27593,
//   -40.8166,
//   -36.64572,
//   -38.95135,
//   -45.0062
// ]
// [
//   -7.85864,
//   -18.92069,
//   -39.59304,
//   -53.766960000000005,
//   -43.55767,
//   -35.27593,
//   -40.8166,
//   -36.64572,
//   -38.95135,
//   -45.006389999999996
// ]
// [
//   -7.85864,
//   -18.92069,
//   -39.59304,
//   -53.766960000000005,
//   -43.55767,
//   -35.27593,
//   -40.8166,
//   on browser i got this
//   Request URL
// http://localhost:3000/api-credentials
// Request Method
// POST
// Status Code
// 500 Internal Server Error
// Remote Address
// [::1]:3000
// Referrer Policy
// strict-origin-when-cross-origin
// access-control-allow-credentials
// true
// access-control-allow-origin
// http://localhost:3002
// connection
// keep-alive
// content-length
// 52
// content-type
// application/json; charset=utf-8
// date
// Tue, 11 Nov 2025 05:44:02 GMT
// etag
// W/"34-rlKccw1E+/fV8niQk4oFitDfPro"
// keep-alive
// timeout=5
// vary
// Origin
// x-powered-by
// Express
// accept
// */*
// accept-encoding
// gzip, deflate, br, zstd
// accept-language
// en-GB,en-US;q=0.9,en;q=0.8
// authorization
// Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjI4Mzk4MTgsImV4cCI6MTc2Mjg0MzQxOCwiYXVkIjoiaHR0cHM6Ly9haS5jb20iLCJpc3MiOiJodHRwczovL2FpLmNvbSIsInN1YiI6IjAzYTRlODZkLTIwNTktNDAzMi1hMDUyLTlhZDMyZWNiNmJiOCJ9.cIuiccdvv0aP8Su-BDgkR5r1bHucMA6C6n0G04wNe_o
// connection
// keep-alive
// content-length
// 78
// content-type
// application/json
// host
// localhost:3000
// origin
// http://localhost:3002
// referer
// http://localhost:3002/
// sec-ch-ua
// "Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"
// sec-ch-ua-mobile
// ?0
// sec-ch-ua-platform
// "Windows"
// sec-fetch-dest
// empty
// sec-fetch-mode
// cors
// sec-fetch-site
// same-site
// user-agent
// Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
// i pass four 