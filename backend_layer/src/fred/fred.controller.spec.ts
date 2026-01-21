import { Test, TestingModule } from '@nestjs/testing';
import { FredController } from './fred.controller';

describe('FredController', () => {
  let controller: FredController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FredController],
    }).compile();

    controller = module.get<FredController>(FredController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
