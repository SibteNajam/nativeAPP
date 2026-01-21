import { Test, TestingModule } from '@nestjs/testing';
import { ExchangesControllerService } from './exchanges-controller.service';

describe('ExchangesControllerService', () => {
  let service: ExchangesControllerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExchangesControllerService],
    }).compile();

    service = module.get<ExchangesControllerService>(ExchangesControllerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
