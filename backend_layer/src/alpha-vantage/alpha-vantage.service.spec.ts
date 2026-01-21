import { Test, TestingModule } from '@nestjs/testing';
import { AlphaVantageService } from './alpha-vantage.service';

describe('AlphaVantageService', () => {
  let service: AlphaVantageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlphaVantageService],
    }).compile();

    service = module.get<AlphaVantageService>(AlphaVantageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
