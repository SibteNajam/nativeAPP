import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AlphaVantageService {
    private readonly apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    private readonly baseUrl = 'https://www.alphavantage.co/query';

    async getRSI14(symbol: string = 'BTC', interval: string = '15min') {
        const url = `${this.baseUrl}?function=RSI&symbol=${symbol}&interval=${interval}&time_period=14&series_type=close&apikey=${this.apiKey}`;

        try {
            const response = await axios.get(url, {
                headers: { 'User-Agent': 'nestjs-axios-client' },
            });

            // AlphaVantage often returns { "Note": "... API call frequency" }
            if (response.data['Note']) {
                throw new HttpException(
                    response.data['Note'],
                    HttpStatus.TOO_MANY_REQUESTS,
                );
            }

            return response.data;
        } catch (error) {
            console.error('Error fetching RSI-14 data:', error.message);

            throw new HttpException(
                'Failed to fetch RSI data from Alpha Vantage',
                HttpStatus.BAD_GATEWAY,
            );
        }
    }
    async getMACD(symbol: string = 'BTC', interval: string = '15min') {
        const url = `${this.baseUrl}?function=MACD&symbol=${symbol}&interval=${interval}&series_type=open&apikey=${this.apiKey}`;

        try {
            const response = await axios.get(url, {
                headers: { 'User-Agent': 'nestjs-axios-client' },
            });

            // AlphaVantage often returns { "Note": "... API call frequency" }
            if (response.data['Note']) {
                throw new HttpException(
                    response.data['Note'],
                    HttpStatus.TOO_MANY_REQUESTS,
                );
            }

            return response.data;
        } catch (error) {
            console.error('Error fetching MACD data:', error.message);

            throw new HttpException(
                'Failed to fetch MACD data from Alpha Vantage',
                HttpStatus.BAD_GATEWAY,
            );
        }
    }

    async getEMA(symbol: string = 'BTC', interval: string = '15min', time_period: number = 60) {
        const url = `${this.baseUrl}?function=EMA&symbol=${symbol}&market=USD&interval=${interval}&time_period=${time_period}&series_type=open&apikey=${this.apiKey}`;

        try {
            const response = await axios.get(url, {
                headers: { 'User-Agent': 'nestjs-axios-client' },
            });

            // AlphaVantage often returns { "Note": "... API call frequency" }
            if (response.data['Note']) {
                throw new HttpException(
                    response.data['Note'],
                    HttpStatus.TOO_MANY_REQUESTS,
                );
            }

            return response.data;
        } catch (error) {
            console.error('Error fetching EMA data:', error.message);

            throw new HttpException(
                'Failed to fetch EMA data from Alpha Vantage',
                HttpStatus.BAD_GATEWAY,
            );
        }
    }
    async getBBands(symbol: string = 'BTC', interval: string = '5min', time_period: number = 60) {
        const url = `${this.baseUrl}?function=BBANDS&symbol=${symbol}&interval=${interval}&time_period=${time_period}&series_type=open&apikey=${this.apiKey}`;

        try {
            const response = await axios.get(url, {
                headers: { 'User-Agent': 'nestjs-axios-client' },
            });

            // AlphaVantage often returns { "Note": "... API call frequency" }
            if (response.data['Note']) {
                throw new HttpException(
                    response.data['Note'],
                    HttpStatus.TOO_MANY_REQUESTS,
                );
            }

            return response.data;
        } catch (error) {
            console.error('Error fetching Bollinger Bands data:', error.message);

            throw new HttpException(
                'Failed to fetch Bollinger Bands data from Alpha Vantage',
                HttpStatus.BAD_GATEWAY,
            );
        }
    }
    async getADX(symbol: string = 'BTC', interval: string = '5min', time_period: number = 14) {
        const url = `${this.baseUrl}?function=ADX&symbol=${symbol}&interval=${interval}&time_period=${time_period}&series_type=open&apikey=${this.apiKey}`;

        try {
            const response = await axios.get(url, {
                headers: { 'User-Agent': 'nestjs-axios-client' },
            });

            // AlphaVantage often returns { "Note": "... API call frequency" }
            if (response.data['Note']) {
                throw new HttpException(
                    response.data['Note'],
                    HttpStatus.TOO_MANY_REQUESTS,
                );
            }

            return response.data;
        } catch (error) {
            console.error('Error fetching ADX data:', error.message);

            throw new HttpException(
                'Failed to fetch ADX data from Alpha Vantage',
                HttpStatus.BAD_GATEWAY,
            );
        }
    }
    async getCPI() {
        const url = `${this.baseUrl}?function=CPI&interval=monthly&apikey=${this.apiKey}`;
        try {
            const response = await axios.get(url, {
                headers: { 'User-Agent': 'nestjs-axios-client' },
            }); 
            // AlphaVantage often returns { "Note": "... API call frequency" }
            if (response.data['Note']) {
                throw new HttpException(
                    response.data['Note'],
                    HttpStatus.TOO_MANY_REQUESTS,
                );
            }
            return response.data;
        } catch (error) {   
            console.error('Error fetching CPI data:', error.message);
            throw new HttpException(
                'Failed to fetch CPI data from Alpha Vantage',
                HttpStatus.BAD_GATEWAY,
            );
        }
    }
}
