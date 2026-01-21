import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UidDto {
  @ApiPropertyOptional({
    description: 'The value cannot be greater than 60000. Default 60000ms',
    example: 60000,
    minimum: 1,
    maximum: 60000,
    default: 60000,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(60000)
  recvWindow?: number;
}
