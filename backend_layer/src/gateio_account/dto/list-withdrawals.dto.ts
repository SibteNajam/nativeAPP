import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListWithdrawalsQueryDto {
  @ApiPropertyOptional({ description: 'Specify the currency. If not specified, returns all currencies' })
  currency?: string;

  @ApiPropertyOptional({ description: "Withdrawal record ID starts with 'w' (e.g. w1879219868). When provided, time-based querying is disabled" })
  withdraw_id?: string;

  @ApiPropertyOptional({ description: 'Currency type of withdrawal record. Supports SPOT (main) or PILOT (innovation zone)' })
  asset_class?: string;

  @ApiPropertyOptional({ description: 'User-defined order number for withdrawal. When provided, time-based querying is disabled' })
  withdraw_order_id?: string;

  @ApiPropertyOptional({ description: 'Start time for querying records (milliseconds). Defaults to 7 days before now if not specified' })
  from?: number;

  @ApiPropertyOptional({ description: 'End timestamp for the query (milliseconds). Defaults to current time if not specified' })
  to?: number;

  @ApiPropertyOptional({ description: 'Maximum number of records returned in a single list' })
  limit?: number;

  @ApiPropertyOptional({ description: 'List offset, starting from 0' })
  offset?: number;
}
