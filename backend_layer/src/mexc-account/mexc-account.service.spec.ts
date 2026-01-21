import { Test, TestingModule } from '@nestjs/testing';
import { MexcAccountService } from './mexc-account.service';

describe('MexcAccountService', () => {
  let service: MexcAccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MexcAccountService],
    }).compile();

    service = module.get<MexcAccountService>(MexcAccountService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
