import { Test, TestingModule } from '@nestjs/testing';
import { CryptoPanicController } from './cryptopanic.controller';

describe('CryptopanicController', () => {
  let controller: CryptoPanicController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CryptoPanicController],
    }).compile();

    controller = module.get<CryptoPanicController>(CryptoPanicController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
