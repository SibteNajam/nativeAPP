import { Test, TestingModule } from '@nestjs/testing';
import { MexcOrderService } from './mexc-order.service';

describe('MexcOrderService', () => {
  let service: MexcOrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MexcOrderService],
    }).compile();

    service = module.get<MexcOrderService>(MexcOrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
