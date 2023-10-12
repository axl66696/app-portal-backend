import {
  ControllerService,
  JetStreamServiceProvider,
} from '@his-base/jetstream';
import { serverConfig } from './server.config.js';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoServiceProvider } from '@his-base/mongo-base';
import { compareSubject } from './utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class NatsServer {
  async #initialize() {
    await JetStreamServiceProvider.initialize(serverConfig);

    MongoServiceProvider.setConfig(serverConfig.dbUrl, serverConfig.dbName);
  }

  async bootstrap() {
    await this.#initialize();

    const jetStreamServer = JetStreamServiceProvider.get();
    const controllerService = new ControllerService();

    const controllers = await controllerService.getAllControllers(
      `${__dirname}/controllers/index.js`,
    );
    controllers.forEach((controller) => {
      const { consumer, subscribers, repliers } =
        controllerService.getControllerMetadata(controller);

      jetStreamServer.subscribe(consumer, (message, payload) => {
        if (message.subject.includes('dashboard')) return message.ack();

        const foundSubscriber = subscribers.find((x) =>
          compareSubject(`${consumer}.${x.subject}`, message.subject),
        );

        if (foundSubscriber) {
          controller[foundSubscriber.methodName](message, payload);
        } else message.nak();
      });

      console.log(`Listening on subject ${consumer}.>`);

      repliers.forEach(({ subject, methodName }) => {
        const fullSubject = `${consumer}.${subject}`;
        jetStreamServer.reply(fullSubject, (message, payload, jsonCodec) => {
          controller[methodName](message, payload, jsonCodec);
        });

        console.log(`Replying on subject ${fullSubject}`);
      });
    });
  }
}

const natsServer = new NatsServer();
natsServer.bootstrap();
