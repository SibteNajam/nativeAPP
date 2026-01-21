import { Controller, Post, Body, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { Public } from '../decorators/isPublic';
import { SltpWebhookService } from './sltp-webhook.service';
import { SltpTriggerDto, SltpTriggerResponseDto } from './dto/sltp-trigger.dto';

/**
 * SLTP Webhook Controller
 * 
 * Receives real-time SLTP triggers from SF App
 * Endpoint is PUBLIC (no JWT required) but uses webhook_secret for auth
 * 
 * POST /sltp-webhook
 * 
 * Flow:
 * 1. SF App detects TP1 hit
 * 2. SF App POSTs to this webhook
 * 3. Backend loops all users holding the symbol
 * 4. Backend executes SELL for each user
 * 5. Response returned to SF
 */
@ApiTags('SLTP Webhook')
@Controller('sltp-webhook')
export class SltpWebhookController {
    private readonly logger = new Logger(SltpWebhookController.name);

    constructor(private readonly sltpWebhookService: SltpWebhookService) { }

    /**
     * Handle SLTP trigger from SF App
     * 
     * @Public - Bypasses JWT guard
     * Uses webhook_secret for authentication instead
     */
    @Public()
    @Post()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Trigger SLTP sell for a symbol',
        description: 'Sells the specified symbol for ALL users holding it. Used by SF App or manual testing to trigger TP/SL exits.'
    })
    @ApiBody({
        description: 'SLTP trigger payload',
        schema: {
            type: 'object',
            required: ['symbol', 'trigger_type', 'quantity_pct'],
            properties: {
                symbol: {
                    type: 'string',
                    example: 'BTCUSDT',
                    description: 'Trading pair symbol (e.g., BTCUSDT, ETHUSDT)'
                },
                trigger_type: {
                    type: 'string',
                    enum: ['TP1_HIT', 'TP2_HIT', 'SL_HIT', 'TRAIL_HIT', 'TIME_EXIT'],
                    example: 'TIME_EXIT',
                    description: 'Type of trigger: TP1_HIT, TP2_HIT, SL_HIT, TRAIL_HIT, TIME_EXIT'
                },
                quantity_pct: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                    example: 1,
                    description: 'Percentage of position to sell (1 = 100%, 0.5 = 50%)'
                },
                trigger_price: {
                    type: 'number',
                    example: 45000.50,
                    description: 'Optional: Price at which the trigger fired'
                },
                timestamp: {
                    type: 'string',
                    example: '2026-01-12T14:30:00+05:00',
                    description: 'Optional: ISO timestamp when trigger fired'
                },
                webhook_secret: {
                    type: 'string',
                    example: 'sltp-webhook-secret-2025',
                    description: 'Optional: Auth secret for verification'
                },
                position_id: {
                    type: 'string',
                    example: 'BTCUSDT:Position:123456',
                    description: 'Optional: Graph position ID for tracking'
                }
            }
        },
        examples: {
            'Full Sell (TIME_EXIT)': {
                summary: 'Sell 100% of position (manual exit)',
                description: 'Use this to manually close an entire position',
                value: {
                    symbol: 'RENDERUSDT',
                    trigger_type: 'TIME_EXIT',
                    quantity_pct: 1
                }
            },
            'Take Profit 1 (50%)': {
                summary: 'TP1 hit - sell 50%',
                description: 'First take profit level hit, sell half',
                value: {
                    symbol: 'BTCUSDT',
                    trigger_type: 'TP1_HIT',
                    quantity_pct: 0.5,
                    trigger_price: 105000
                }
            },
            'Stop Loss (100%)': {
                summary: 'SL hit - sell all',
                description: 'Stop loss triggered, exit entire position',
                value: {
                    symbol: 'ETHUSDT',
                    trigger_type: 'SL_HIT',
                    quantity_pct: 1,
                    trigger_price: 3200
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'SLTP trigger processed successfully',
        schema: {
            example: {
                success: true,
                trigger_type: 'TIME_EXIT',
                symbol: 'RENDERUSDT',
                users_processed: 1,
                users_sold: 1,
                users_failed: 0,
                message: 'SLTP TIME_EXIT processed in 245ms',
                execution_details: [
                    {
                        userId: 'k0eFLomN...',
                        exchange: 'binance',
                        success: true,
                        orderId: 1234567890,
                        quantity: '5.31',
                        price: 2.44
                    }
                ]
            }
        }
    })
    @ApiResponse({ status: 401, description: 'Invalid webhook secret' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async handleTrigger(@Body() trigger: SltpTriggerDto): Promise<SltpTriggerResponseDto> {
        this.logger.log(`📥 Received SLTP trigger: ${trigger.trigger_type} for ${trigger.symbol}`);

        const result = await this.sltpWebhookService.processTrigger(trigger);

        this.logger.log(
            `📤 SLTP response: ${result.users_sold}/${result.users_processed} users sold, ` +
            `${result.users_failed} failed`
        );

        return result;
    }

    /**
     * Health check for SLTP webhook
     */
    @Public()
    @Post('health')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'SLTP Webhook Health Check',
        description: 'Check if the SLTP webhook service is running'
    })
    @ApiResponse({
        status: 200,
        description: 'Service is healthy',
        schema: {
            example: {
                status: 'healthy',
                timestamp: '2026-01-12T14:30:00.000Z'
            }
        }
    })
    async healthCheck(): Promise<{ status: string; timestamp: string }> {
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
        };
    }
}
