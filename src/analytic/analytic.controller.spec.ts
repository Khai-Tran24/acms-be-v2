import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticController } from './analytic.controller';
import { AnalyticService } from './analytic.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('AnalyticController', () => {
  let controller: AnalyticController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticController],
      providers: [{ provide: AnalyticService, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AnalyticController>(AnalyticController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
