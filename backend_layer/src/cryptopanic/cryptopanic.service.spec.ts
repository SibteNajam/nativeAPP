import { Test, TestingModule } from '@nestjs/testing';
import { CryptoPanicService } from './cryptopanic.service';

describe('CryptoPanicService', () => {
  let service: CryptoPanicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptoPanicService],
    }).compile();

    service = module.get<CryptoPanicService>(CryptoPanicService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
