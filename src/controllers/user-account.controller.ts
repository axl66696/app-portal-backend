import {
  Controller,
  JetStreamServiceProvider,
  Replier,
  Subscriber,
} from '@his-base/jetstream';
import { MongoBaseService } from '@his-base/mongo-base';
import { OrderService } from '@his-model/nats-oriented-services';
import { Codec, JsMsg, Msg } from 'nats';
import { UserAccount } from './types/user-account';
@Controller('userAccount')
export class UserAccountController {
  jetStreamService = JetStreamServiceProvider.get();

  mongoDB = new MongoBaseService("mongodb://localhost:27017", "UserDatabase");

  constructor(
    private readonly orderService: OrderService = new OrderService(),
  ) {}

  @Subscriber('update.many')
  updateMany(message: JsMsg, payload: any) {
    try {
      message.ack();
      for (const item of payload){
        const { _id, ...resetUserInfo } = item;
        this.mongoDB.collections("user").collection.updateMany({userCode:item.userCode},{$set:resetUserInfo});
      }
   
    } catch (error) {
      console.error('Error processing order.create: ', error);
      message.nak();
    }
  }

  @Subscriber('update.userFavorite')
  async updateUserFavorite(message: JsMsg, payload: any) {
    try {
      /**payload 排除_id  */
      
      const { _id, ...resetUserInfo } = payload;
      message.ack();
      this.mongoDB.collections("user").collection.updateOne({userCode: payload.userCode}, {$set:resetUserInfo});

    } catch (error) {
      console.error('Error processing order.create: ', error);
      message.nak();
    }
  }


  @Subscriber('update')
  createOrder(message: JsMsg, payload: any) {
    try {

      /**payload 排除_id  */
      const { _id, ...resetUserInfo } = payload;
      message.ack();
      this.mongoDB.collections("user").collection.updateOne({userCode: payload.userCode}, {$set:resetUserInfo});
   
    } catch (error) {
      console.error('Error processing order.create: ', error);
      message.nak();
    }
  }


  @Subscriber('*.*.update')
  updateOrder(message: JsMsg, payload: any) {
    try {
      console.log('Processing time update', payload);

      message.ack();
    } catch (error) {
      console.error('Error processing order.*.*.update: ', error);
      message.nak();
    }
  }

  @Replier('list')
  async getAllUser(message: Msg, payload: any, jsonCodec: Codec<any>) {
    const getUsersInfo = await this.mongoDB.collections("user").findDocuments({})
    console.log("==================================")
    console.log(getUsersInfo);

    message.respond(jsonCodec.encode(getUsersInfo));
  }

  @Subscriber('insertNews')
  insertNews(message: JsMsg, payload: any) {
    try {

      /**payload 排除_id  */
      const { _id, ...resetUserInfo } = payload.data;
      console.log("payload", payload)
      message.ack();
      console.log("payload.userCode", payload.data.userCode);
      // console.log("resetUserInfo",resetUserInfo);
      // console.log("resetUserInfo.userCode", resetUserInfo.userCode)
      this.mongoDB.collections("user").collection.updateOne({userCode: payload.data.userCode}, {$push:{userNews:payload.data}});
      setTimeout(()=>{
        this.jetStreamService.publish("userAccount.wantUserNews", resetUserInfo);
      }, 1000)
   
    } catch (error) {
      console.error('Error processing order.create: ', error);
      message.nak();
    }
  }

  @Subscriber("wantUserNews")
  newCreateOrder(message: JsMsg, payload: any) {
    try {
      this.orderService.processMessage(payload);
      console.log("controller payload", payload)
      console.log("controller 聽到的subject", message.subject)


      console.log("payload.data.userCode", payload.userCode)

      const breakingNews = this.mongoDB
        .collections("user")
        .findDocuments({'userCode':payload.userCode})
        .then((news) => {
          // console.log(x);
          //  這裡拿到mongoDB資料之後要去publish給前端sub做畫面顯示用
          this.jetStreamService.publish("userAccount.getNews.dashboard", news);
          console.log('nats裡news更新後的資料',news);
        });
      console.log(breakingNews);
      message.ack();

    } catch (error) {
      console.error("Error processing order.create: ", error);
      message.nak();
    }
  }
}
