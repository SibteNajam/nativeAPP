import { Test, TestingModule } from '@nestjs/testing';
import { MexcMarketService } from './mexc-market.service';

describe('MexcMarketService', () => {
  let service: MexcMarketService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MexcMarketService],
    }).compile();

    service = module.get<MexcMarketService>(MexcMarketService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
