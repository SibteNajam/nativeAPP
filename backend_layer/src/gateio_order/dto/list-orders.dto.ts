import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class ListOrdersQueryDto {
  @ApiProperty({ description: 'Currency pair (required for open orders)', required: false })
  currency_pair?: string;

  @ApiProperty({ description: 'List orders based on status', enum: ['open', 'finished', 'closed', 'cancelled'], required: true })
  status: string;

  @ApiPropertyOptional({ description: 'Page number (optional)' })
  page?: number;

  @ApiPropertyOptional({ description: 'Maximum number of records to be returned. If status is open, maximum of limit is 100' })
  limit?: number;

  @ApiPropertyOptional({ description: 'Specify query account' })
  account?: string;

  @ApiPropertyOptional({ description: 'Start timestamp for the query (milliseconds)' })
  from?: number;

  @ApiPropertyOptional({ description: 'End timestamp for the query (milliseconds). Defaults to current time if not specified' })
  to?: number;

  @ApiPropertyOptional({ description: 'Specify all bids or all asks, both included if not specified', enum: ['buy', 'sell'] })
  side?: string;
}
