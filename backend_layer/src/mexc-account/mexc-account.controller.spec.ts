import { Test, TestingModule } from '@nestjs/testing';
import { MexcAccountController } from './mexc-account.controller';

describe('MexcAccountController', () => {
  let controller: MexcAccountController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MexcAccountController],
    }).compile();

    controller = module.get<MexcAccountController>(MexcAccountController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
