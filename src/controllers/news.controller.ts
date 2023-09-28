import {
  Controller,
  JetStreamServiceProvider,
  Replier,
  Subscriber,
} from "@his-base/jetstream";
import { OrderService } from "@his-model/nats-oriented-services";
import { Codec, JsMsg, Msg } from "nats";
import { MongoBaseService } from '@his-base/mongo-base';

@Controller("news")
export class NewsController {
  jetStreamService = JetStreamServiceProvider.get();

  mongoDB = new MongoBaseService("mongodb://localhost:27017", "newsDatabase");

  constructor(
    private readonly orderService: OrderService = new OrderService()
  ) {}

  @Subscriber("create")
  createOrder(message: JsMsg, payload: any) {
    try {
      this.orderService.processMessage(payload);

      message.ack();

      setTimeout(() => {
        this.jetStreamService.publish("order.create", "Hello Again");
      }, 2000);
    } catch (error) {
      console.error("Error processing order.create: ", error);
      message.nak();
    }
  }

  @Subscriber("*.*.update")
  updateOrder(message: JsMsg, payload: any) {
    try {
      console.log("Processing time update", payload);

      message.ack();
    } catch (error) {
      console.error("Error processing order.*.*.update: ", error);
      message.nak();
    }
  }

  @Replier("list")
  async getOrders(message: Msg, payload: any, jsonCodec: Codec<any>) {
    const orders = await this.orderService.getAllOrders();

    console.log(orders);

    message.respond(jsonCodec.encode(orders));
  }

  @Subscriber("insertNews")
  insertNews(message: JsMsg, payload: any) {
    try {

      /**payload 排除_id  */
      const { _id, ...resetUserInfo } = payload;
      console.log("payload", payload)
      message.ack();
      console.log("payload.data.userCode", payload.data.userCode);
      // console.log("resetUserInfo",resetUserInfo);
      // console.log("resetUserInfo.userCode", resetUserInfo.userCode)
      // this.mongoDB.collections("user").collection.updateOne({userCode: payload.data.userCode}, {$push:{userNews:payload.data}});
      console.log("payload.data", payload.data)
      this.mongoDB.collections("news").collection.insertOne(payload.data)

      // setTimeout(()=>{
      //   this.jetStreamService.publish("news.wantNews", payload.data.userCode);
      // }, 100)
      this.jetStreamService.publish("news.callWantNews", payload.data.userCode);

    } catch (error) {
      console.error('Error processing order.create: ', error);
      message.nak();
    }
  }

  @Subscriber("callWantNews")
  callWantNews(message: JsMsg, payload: any) {
    try {
      this.jetStreamService.publish("news.wantNews", payload);

    } catch (error) {
      console.error('Error processing order.create: ', error);
      message.nak();
    }
  }

  @Subscriber("wantNews")
  wantNews(message: JsMsg, payload: any) {
    try {
      this.orderService.processMessage(payload);
      console.log("controller payload", payload)
      console.log("controller 聽到的subject", message.subject)


      console.log("payload.data.userCode", payload)

      const breakingNews = this.mongoDB
        .collections("news")
        .findDocuments({'userCode':payload})
        .then((news) => {
          // console.log(x);
          //  這裡拿到mongoDB資料之後要去publish給前端sub做畫面顯示用
          this.jetStreamService.publish("news.getNews.dashboard", news);
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
