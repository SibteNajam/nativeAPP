import { Test, TestingModule } from '@nestjs/testing';
import { MexcOrderController } from './mexc-order.controller';

describe('MexcOrderController', () => {
  let controller: MexcOrderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MexcOrderController],
    }).compile();

    controller = module.get<MexcOrderController>(MexcOrderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
