import { ApiProperty } from "@nestjs/swagger";
import {IsOptional, IsString } from "class-validator";

export class OrderInfo {

    @ApiProperty({ description: 'Trading pair, e.g., BTCUSDT' })
    @IsString()
    symbol: string;
    @ApiProperty({ description: 'Order ID' })
    @IsOptional()
    @IsString()
    orderId?: string;
    @ApiProperty({ description: 'Client order ID' })
    @IsOptional()
    @IsString()
    clientOid?: string;
}