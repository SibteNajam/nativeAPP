import { Test, TestingModule } from '@nestjs/testing';
import { GateioAccountController } from './gateio_account.controller';

describe('GateioAccountController', () => {
  let controller: GateioAccountController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GateioAccountController],
    }).compile();

    controller = module.get<GateioAccountController>(GateioAccountController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
