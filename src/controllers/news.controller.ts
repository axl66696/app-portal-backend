import {
  Controller,
  JetStreamServiceProvider,
  Replier,
  Subscriber,
} from "@his-base/jetstream";
import { OrderService } from "@his-model/nats-oriented-services";
import { Codec, JsMsg, Msg } from "nats";
import { MongoBaseService } from '@his-base/mongo-base';
import { News } from '@his-viewmodel/app-portal'

@Controller("news")
export class NewsController {
  jetStreamService = JetStreamServiceProvider.get();

  mongoDB = new MongoBaseService("mongodb://localhost:27017", "AppPortal");

  constructor(
    private readonly orderService: OrderService = new OrderService()
  ) {}

  @Replier("news.find")
  async getNewsList(message: Msg, payload: any, jsonCodec: Codec<any>) {
    
    const orders = await this.orderService.getAllOrders();

    const breakingNews = this.mongoDB
        .collections("News")
        .findDocuments({'userCode':payload.data})
        .then((news) => {
          message.respond(jsonCodec.encode(news));  
        });
  }

  @Subscriber("news.setNews.>")
  setNews(message: JsMsg, payload: any) {
    try {
      const tmpDate = new Date()
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
      this.mongoDB.collections("News").updateDocument({userCode:tmp.userCode, _id:tmp._id},{$set:tmp},{upsert:true})
    
      message.ack();
    } catch (error) {
      console.error("Error processing appPortal.setNews: ", error);
      message.nak();
    }
  }

  @Subscriber("news.appNews")
  published(message: JsMsg, payload: any) {
    try {
      const tmpDate = new Date()
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
      message.ack();
      this.mongoDB.collections("News").insertDocument(tmp)
      //到db拿userCode
      this.jetStreamService.publish("news.userNews.userCode", {_id:tmp._id, execTime:tmp.execTime})
      
    } catch (error) {
      console.error("Error processing appPortal.setNews: ", error);
      message.nak();
    }
  }

  @Subscriber("news.userNews")
  updateStatus(message: JsMsg, payload: any) {

  }

  @Replier("news.userNews")
  getNewsLis(message: Msg, payload: any, jsonCodec: Codec<any>) {

  }

  @Subscriber("news.newsContent")
  getNewsContent(message: JsMsg, payload: any) {

  }


}
