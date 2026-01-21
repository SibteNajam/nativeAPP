import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

/**
 * DTO for SLTP Trigger Webhook from SF App
 * 
 * SF App sends this when TP/SL trigger fires (e.g., price hits TP1)
 * Backend loops all users holding this symbol and sells for each
 */
export class SltpTriggerDto {
    @IsString()
    symbol: string;                 // "BTCUSDT"

    @IsString()
    trigger_type: string;           // "TP1_HIT" | "TP2_HIT" | "SL_HIT" | "TRAIL_HIT" | "TIME_EXIT"

    @IsOptional()
    @IsNumber()
    trigger_price?: number;          // 105000 - price at which trigger fired (optional for testing)

    @IsString()
    @IsOptional()
    timestamp?: string;              // ISO timestamp when trigger fired

    @IsNumber()
    @Min(0)
    @Max(1)
    quantity_pct: number;           // 0.5 for TP1 (50%), 1.0 for full exit

    @IsString()
    @IsOptional()
    webhook_secret?: string;        // Auth secret for verification

    @IsString()
    @IsOptional()
    position_id?: string;           // Graph position ID for tracking
}

/**
 * Response DTO for SLTP Webhook
 */
export class SltpTriggerResponseDto {
    success: boolean;
    trigger_type: string;
    symbol: string;
    users_processed: number;
    users_sold: number;
    users_failed: number;
    message: string;
    execution_details: Array<{
        userId: string;
        exchange: string;
        success: boolean;
        orderId?: string | number;
        error?: string;
        quantity?: string;
        price?: number;
    }>;
}
