import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class EncryptPreviewDto {
    @ApiProperty({
        description: 'The plain text to encrypt',
        example: 'my-secret-key-123',
    })
    @IsString()
    @IsNotEmpty()
    plainText: string;
}
