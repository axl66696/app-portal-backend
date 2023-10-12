import {
  Controller,
  JetStreamServiceProvider,
  Replier,
  Subscriber,
} from "@his-base/jetstream";
import { OrderService } from "@his-model/nats-oriented-services";
import { Codec, JsMsg, Msg } from "nats";
import { MongoBaseService } from '@his-base/mongo-base';
<<<<<<< HEAD
import { News } from '@his-viewmodel/app-portal'
=======
>>>>>>> 5e2ffd24a1c345f6a68ee82267b8f9cff1c99bc6

@Controller("news")
export class NewsController {
  jetStreamService = JetStreamServiceProvider.get();

<<<<<<< HEAD
  mongoDB = new MongoBaseService("mongodb://localhost:27017", "AppPortal");
=======
  mongoDB = new MongoBaseService("mongodb://localhost:27017", "newsDatabase");
>>>>>>> 5e2ffd24a1c345f6a68ee82267b8f9cff1c99bc6

  constructor(
    private readonly orderService: OrderService = new OrderService()
  ) {}

  @Subscriber("create")
  createOrder(message: JsMsg, payload: any) {
    try {
      this.orderService.processMessage(payload.data);

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
<<<<<<< HEAD
  async insertNews(message: JsMsg, payload: any) {
    try {

      /**payload 排除_id  */
      // const { _id, ...resetUserInfo } = payload;
=======
  insertNews(message: JsMsg, payload: any) {
    try {

      /**payload 排除_id  */
      const { _id, ...resetUserInfo } = payload;
>>>>>>> 5e2ffd24a1c345f6a68ee82267b8f9cff1c99bc6
      console.log("payload", payload)
      message.ack();
      console.log("payload.data.userCode", payload.data.userCode);
      // console.log("resetUserInfo",resetUserInfo);
      // console.log("resetUserInfo.userCode", resetUserInfo.userCode)
      // this.mongoDB.collections("user").collection.updateOne({userCode: payload.data.userCode}, {$push:{userNews:payload.data}});
<<<<<<< HEAD
      const tmp = {
        "_id": payload.data._id as String,
        "appId": payload.data.appId,
        "userCode": payload.data.userCode,
        "subject": payload.data.subject,
        "url": payload.data.url,
        "sharedData": payload.data.sharedData,
        "period": {
          "start": new Date(payload.data.period.start),
          "end": new Date(payload.data.period.end)
        },
        "type": payload.data.type,
        "execTime": new Date(payload.data.execTime),
        "execStatus": payload.data.execStatus,
        "updatedBy": payload.data.updatedBy,
        "updatedAt": new Date(payload.data.updatedAt)
      }
      console.log("payload.data", payload.data as News)
      console.log("tmp date", typeof tmp.execTime)
      console.log("payload date", typeof payload.data.execTime)
      await this.mongoDB.collections("News").insertDocument(tmp)


      // setTimeout(()=>{
      //   this.jetStreamService.publish("news.callWantNews", payload.data.userCode);
      // }, 10)
      
      // setTimeout(()=>{
      //   this.jetStreamService.publish("news.getNews", {data: payload.data.userCode});
      // }, 10)
      await this.jetStreamService.publish("news.getNews", {data: payload.data.userCode});
      // this.jetStreamService.publish("news.callWantNews", payload.data.userCode);
      message.ack();
=======
      console.log("payload.data", payload.data)
      this.mongoDB.collections("news").collection.insertOne(payload.data)

      // setTimeout(()=>{
      //   this.jetStreamService.publish("news.wantNews", payload.data.userCode);
      // }, 100)
      this.jetStreamService.publish("news.callWantNews", payload.data.userCode);
>>>>>>> 5e2ffd24a1c345f6a68ee82267b8f9cff1c99bc6

    } catch (error) {
      console.error('Error processing order.create: ', error);
      message.nak();
    }
  }

<<<<<<< HEAD
  // @Subscriber("callWantNews")
  // callWantNews(message: JsMsg, payload: any) {
  //   try {
  //     const encapPayload = {data: payload}
  //     this.jetStreamService.publish("news.wantNews", encapPayload);
  //     message.ack();

  //   } catch (error) {
  //     console.error('Error processing order.create: ', error);
  //     message.nak();
  //   }
  // }

  @Subscriber("getNews")
  getNews(message: JsMsg, payload: any) {
    try {
      this.orderService.processMessage(payload);
      console.log("payload", payload);
      console.log("controller payload", payload.data)
      console.log("controller 聽到的subject", message.subject)


      console.log("payload.data.userCode", payload.data)

      const breakingNews = this.mongoDB
        .collections("News")
        .findDocuments({'userCode':payload.data})
        .then((news) => {
          // console.log(x);
          //  這裡拿到mongoDB資料之後要去publish給前端sub做畫面顯示用
          this.jetStreamService.publish("news.showNews.dashboard", news);
          console.log('nats裡news更新後的資料',news);
          console.log("execTime", news[0].execTime)
          console.log("execTime type", typeof news[0].execTime)
=======
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
>>>>>>> 5e2ffd24a1c345f6a68ee82267b8f9cff1c99bc6
        });
      console.log(breakingNews);
      message.ack();

    } catch (error) {
      console.error("Error processing order.create: ", error);
      message.nak();
    }
  }
<<<<<<< HEAD

  @Subscriber("updateStatus")
  updateStatus(message: JsMsg, payload: any) {
    try {
      console.log("Processing time update", payload);
      console.log("updateStatus payload.data.userCode", payload.data.userCode);
      console.log("updateStatus payload.data.newsId", payload.data.newsId);

      const tmpDate = new Date(payload.data.date)

      this.mongoDB.collections("News").updateDocument({userCode:payload.data.userCode, _id:payload.data.newsId},{$set:{"execStatus":{code:"60",display:"已讀/已完成"},"execTime": tmpDate}})
      setTimeout(()=>{
        this.jetStreamService.publish("news.getNews", {data: payload.data.userCode});
      }, 10)
      // this.jetStreamService.publish("news.callWantNews", payload.data.userCode);
      message.ack();
    } catch (error) {
      console.error("Error processing order.*.*.update: ", error);
      message.nak();
    }
  }
=======
>>>>>>> 5e2ffd24a1c345f6a68ee82267b8f9cff1c99bc6
}
