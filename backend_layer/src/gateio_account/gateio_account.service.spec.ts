import { Test, TestingModule } from '@nestjs/testing';
import { GateioAccountService } from './gateio_account.service';

describe('GateioAccountService', () => {
  let service: GateioAccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GateioAccountService],
    }).compile();

    service = module.get<GateioAccountService>(GateioAccountService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
