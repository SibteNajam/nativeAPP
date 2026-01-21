import { Test, TestingModule } from '@nestjs/testing';
import { AlphaVantageController } from './alpha-vantage.controller';

describe('AlphaVantageController', () => {
  let controller: AlphaVantageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlphaVantageController],
    }).compile();

    controller = module.get<AlphaVantageController>(AlphaVantageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
