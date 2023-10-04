import {
  Controller,
  JetStreamServiceProvider,
  Replier,
  Subscriber,
} from '@his-base/jetstream';
import { MongoBaseService } from '@his-base/mongo-base';
import { Codec, JsMsg, Msg } from 'nats';

@Controller('UserAppStore')
export class UserAppStoreController {
  jetStreamService = JetStreamServiceProvider.get();

  mongoDB = new MongoBaseService("mongodb://localhost:27017", "UserDatabase");

  constructor(

  ) {}

  @Subscriber('update.isFavorite')
  async updateUserFavorite(message: JsMsg, payload: any) {
    try {
      /**payload 排除_id  */
      
      const { _id, ...resetUserInfo } = payload.data;
      message.ack();
      this.mongoDB.collections("userAppStore").collection().updateOne({userCode: payload.data.userCode}, {$set:resetUserInfo});

    } catch (error) {
      console.error('Error processing order.create: ', error);
      message.nak();
    }
  }

}
