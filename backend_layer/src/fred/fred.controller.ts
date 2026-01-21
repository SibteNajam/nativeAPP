import { Controller, Get, Query } from '@nestjs/common';
import { FredService } from './fred.service';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';

@Controller('fred')
export class FredController {
    constructor(private readonly fredService: FredService) { }

    @Get()
    @ApiOperation({ summary: 'Get Fred data' })
    @ApiQuery({ name: 'series_id', required: true, description: 'Series ID, default is PAYEMS (Nonfarm Payrolls) T5YIFR(5-Year, 5-Year Forward Inflation Expectation Rate) CES0500000003(Real Earnings) JTS00000000JOL(Job Openings and Labor Turnover Survey (JOLTS)) CFNAI(Chicago Fed National Activity Index)' })
    async fetchNFP(@Query('series_id') series_id: string) {
        return this.fredService.getIndicatorData(series_id);
    }
}
