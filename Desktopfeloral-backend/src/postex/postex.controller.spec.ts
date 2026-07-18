import { Test, TestingModule } from '@nestjs/testing';

import { PostexController, PostexWebhookController } from './postex.controller';
import { PostexService } from './postex.service';

describe('Postex controllers', () => {
  let controller: PostexController;
  let webhookController: PostexWebhookController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostexController, PostexWebhookController],
      providers: [{ provide: PostexService, useValue: {} }],
    }).compile();

    controller = module.get<PostexController>(PostexController);
    webhookController = module.get<PostexWebhookController>(
      PostexWebhookController,
    );
  });

  it('creates the authenticated Postex controller', () => {
    expect(controller).toBeDefined();
  });

  it('creates the Postex webhook controller', () => {
    expect(webhookController).toBeDefined();
  });
});
