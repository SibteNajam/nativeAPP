import { Test, TestingModule } from '@nestjs/testing';
import { GateioOrderController } from './gateio_order.controller';

describe('GateioOrderController', () => {
  let controller: GateioOrderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GateioOrderController],
    }).compile();

    controller = module.get<GateioOrderController>(GateioOrderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
