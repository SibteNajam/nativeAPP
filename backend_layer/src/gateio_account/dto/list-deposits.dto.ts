import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListDepositsQueryDto {
  @ApiPropertyOptional({ description: 'Specify the currency. If not specified, returns all currencies' })
  currency?: string;

  @ApiPropertyOptional({ description: 'Start time for querying records (milliseconds). Defaults to 7 days before now if not specified' })
  from?: number;

  @ApiPropertyOptional({ description: 'End timestamp for the query (milliseconds). Defaults to current time if not specified' })
  to?: number;

  @ApiPropertyOptional({ description: 'Maximum number of entries returned in the list, limited to 500 transactions' })
  limit?: number;

  @ApiPropertyOptional({ description: 'List offset, starting from 0' })
  offset?: number;
}
