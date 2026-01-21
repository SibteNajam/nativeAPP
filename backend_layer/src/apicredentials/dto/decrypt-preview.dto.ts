import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DecryptPreviewDto {
    @ApiProperty({
        description: 'The encrypted text to decrypt',
        example: 'aeb047cc0d2f13f60798454b16535b96756aad22acc7e80b4a3d6081b3dcd7568eae95abcb7ffb4025bcb8456ff625d15a7ddf293a505c228fd2b490d03610f599feb07775e50f8d06965e632753318d',
    })
    @IsString()
    @IsNotEmpty()
    encryptedText: string;
}
