import { Test, TestingModule } from '@nestjs/testing';
import { FredService } from './fred.service';

describe('FredService', () => {
  let service: FredService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FredService],
    }).compile();

    service = module.get<FredService>(FredService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
