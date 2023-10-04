import {
  Controller,
  JetStreamServiceProvider,
  Replier,
  Subscriber,
} from "@his-base/jetstream";
import { MongoBaseService } from "@his-base/mongo-base";
import { Codec, JsMsg, Msg } from "nats";

@Controller('UserAppStore')
export class UserAppStoreController {
  jetStreamService = JetStreamServiceProvider.get();

  mongoDB = new MongoBaseService("mongodb://localhost:27017", "AppPortal");

  constructor() {}

  @Subscriber("update.isFavorite")
  async updateUserFavorite(message: JsMsg, payload: any) {
    try {
      /**payload 排除_id  */
      const { _id, ...resetUserInfo } = payload.data;
      console.log(`我的最愛`,payload.data)
      message.ack();
      await this.mongoDB.connect();
      this.mongoDB
        .collections("UserAppStore")
        .collection()
        .updateOne(
          { userCode: payload.data.userCode ,appId : payload.data.appId },
          { $set: resetUserInfo }
        );
    } catch (error) {
      console.error("更新錯誤Error processing order.create: ", error);
      message.nak();
    }
  }

  @Replier("myAppStore")
  async getMyAppStore(message: Msg, payload: any, jsonCodec: Codec<any>) {
    
    const pipeline = [
      /**第一階段：篩選符合條件的 UserAppStore 數據 */
      {
        $match: {
          'userCode.code': payload.data
        }
      },
      /**第二階段：從 UserAppStore 集合中關聯 AppStore 數據 */
      {
        $lookup: {
          from: "AppStore", // 關聯的collection名稱
          localField: "appId", // UserAppStore 集合中的字段，用於關聯
          foreignField: "_id", // AppStore 集合中的字段，用於關聯
          as: "appStoreData" // 輸出字段的别名
        }
      },
      /**第三階段：將相關數據進行重構，生成合併後的文檔 */
      {
        $unwind: {
          path: "$appStoreData", 
          preserveNullAndEmptyArrays: true 
        }
      },
      /**第四階段：輸出所需的欄位 */
      {
        $project: {
          userCode: 1,
          appId: "$appStoreData._id", // 使用 appStoreData 中的 _id
          title: "$appStoreData.title",
          versionNo: "$appStoreData.versionNo",
          type: "$appStoreData.type",
          url: "$appStoreData.url",
          home: "$appStoreData.home",
          language: "$appStoreData.language",
          icon: "$appStoreData.icon",
          appPages: "$appStoreData.appPages",
          isFavorite: 1 // 从 UserAppStore 中的 isFavorite 字段获取
        }
      }
    ];

    /**第四階段：執行聚合查詢 */
    const myAppStore = await this.mongoDB.collections("UserAppStore").aggregateDocuments(pipeline);

     console.log('myAppStore',myAppStore);
    
    if (myAppStore) {
      message.respond(jsonCodec.encode(myAppStore));
      console.log(message.respond(jsonCodec.encode(myAppStore)));
    } 
  }

  @Replier("list")
  async getUserAppStore(message: Msg, payload: any, jsonCodec: Codec<any>) {
    
    const userAppStore = await this.mongoDB.collections("UserAppStore").findDocuments({'userCode.code':payload.data});

    if (userAppStore) {
      message.respond(jsonCodec.encode(userAppStore));
      console.log(message.respond(jsonCodec.encode(userAppStore)));
    }  else {
      const returnMessage = (`cant find userApp`);
      message.respond(jsonCodec.encode(returnMessage));
    }
  }
}
