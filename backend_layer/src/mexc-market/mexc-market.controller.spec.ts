import { Test, TestingModule } from '@nestjs/testing';
import { MexcMarketController } from './mexc-market.controller';

describe('MexcMarketController', () => {
  let controller: MexcMarketController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MexcMarketController],
    }).compile();

    controller = module.get<MexcMarketController>(MexcMarketController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
