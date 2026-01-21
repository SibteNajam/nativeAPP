import { Test, TestingModule } from '@nestjs/testing';
import { ExchangesControllerController } from './exchanges-controller.controller';

describe('ExchangesControllerController', () => {
  let controller: ExchangesControllerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExchangesControllerController],
    }).compile();

    controller = module.get<ExchangesControllerController>(ExchangesControllerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
