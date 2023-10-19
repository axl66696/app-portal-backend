import {
  Controller,
  JetStreamServiceProvider,
  Replier,
  Subscriber,
} from "@his-base/jetstream";
import { MongoBaseService } from "@his-base/mongo-base";
import { OrderService } from "@his-model/nats-oriented-services";
import { Codec, JsMsg, Msg } from "nats";
import { UserAccount,UserProfile } from "@his-viewmodel/app-portal";
import nodemailer from "nodemailer";
// import SMTPServer from "smtp-server"
import fs from "fs";
import jwt from "jsonwebtoken";

@Controller("appPortal")
export class AppPortalController {
  jetStreamService = JetStreamServiceProvider.get();

  mongoDB = new MongoBaseService("mongodb://localhost:27017", "AppPortal");

  constructor(
    private readonly orderService: OrderService = new OrderService()
  ) {}

  @Subscriber("update.many")
  updateMany(message: JsMsg, payload: any) {
    try {
      message.ack();
      for (const item of payload.data) {
        const { _id, ...resetUserInfo } = item;
        this.mongoDB
          .collections("user")
          .collection()
          .updateMany({ userCode: item.userCode }, { $set: resetUserInfo });
      }
    } catch (error) {
      console.error("Error processing order.create: ", error);
      message.nak();
    }
  }

  // @Subscriber("update.userFavorite")
  // async updateUserFavorite(message: JsMsg, payload: any) {
  //   try {
  //     /**payload 排除_id  */

  //     const { _id, ...resetUserInfo } = payload.data;
  //     message.ack();
  //     this.mongoDB
  //       .collections("user")
  //       .collection()
  //       .updateOne(
  //         { userCode: payload.data.userCode },
  //         { $set: resetUserInfo }
  //       );
  //   } catch (error) {
  //     console.error("Error processing order.create: ", error);
  //     message.nak();
  //   }
  // }

  @Replier("userAccount.userToken")
  async getUserToken(message: Msg, payload: any, jsonCodec: Codec<any>) {
    console.log(payload.data.userCode.code);
    const getUserInfo = await this.mongoDB
      .collections("UserAccount")
      .findDocuments({
        "userCode.code": payload.data.userCode.code,
        passwordHash: payload.data.passwordHash,
        "hospital.display": payload.data.orgNo,
      });
    const userInfo: UserAccount = getUserInfo[0] as unknown as UserAccount;
    console.log(userInfo);

    if (userInfo) {
      const secret = process.env.saltKey;
      const token = jwt.sign(payload.data, secret, {
        expiresIn: "30d",
        algorithm: "HS256",
      });
      const returnMessage = { userCode: userInfo.userCode, token: token };
      message.respond(jsonCodec.encode(returnMessage));
    } else {
      const returnMessage = { userCode: {}, token: "" };
      message.respond(jsonCodec.encode(returnMessage));
    }
  }

  @Replier("userAccount.find")
  async getUserAccount(message: Msg, payload: any, jsonCodec: Codec<any>) {
    // 因為mongoDBservice裡面的findDocuments會自動close掉mongoDB的連線
    // 所以在這裡改成原生的mongoDB
    await this.mongoDB.connect();
    const getUserInfo = await this.mongoDB
      .collections("UserAccount")
      .collection()
      .find({ "userCode.code": payload.data })
      .toArray();
    // console.log("userInfo", getUserInfo);
    const userInfo: UserAccount = getUserInfo[0] as unknown as UserAccount;
    console.log(userInfo);
    if (userInfo) {
      const returnMessage =  userInfo;
      message.respond(jsonCodec.encode(returnMessage));
    } else {
      const returnMessage =  {} ;
      message.respond(jsonCodec.encode(returnMessage));
    }
  }

  @Subscriber("userAccount.modifyPassword")
  updatePassword(message: JsMsg, payload: any) {
    try {
      message.ack();
      this.mongoDB.connect();
      this.mongoDB
        .collections("UserAccount")
        .collection()
        .updateOne(
          { "userCode.code": payload.data.userCode },
          { $set: { passwordHash: payload.data.passwordHash } }
        );
    } catch (error) {
      console.error("Error processing order.create: ", error);
      message.nak();
    }
  }

  @Subscriber("userAccount.sendMail")
  async sendMail(message: JsMsg, payload: any) {
    try {
      const getUserInfo = await this.mongoDB
        .collections("UserAccount")
        .findDocuments({
          "userCode.code": payload.data.userCode,
          eMail: payload.data.eMail,
        });
        const userInfo: UserAccount = getUserInfo[0] as unknown as UserAccount;
        console.log(userInfo);
        // this.smtpServer.listen(3333)
        const transporter = nodemailer.createTransport({
          // service: "Gmail", // 例如，'Gmail' 或 'SMTP'
          host: "sandbox.smtp.mailtrap.io",
          port: 587,
          auth: {
                user: "de5a86a64af0a0", // 你的電子郵件地址
                // user: "H34076144@gs.ncku.edu.tw",
                // pass: "mmhz nyso oizj goxs", // 你的電子郵件密碼
                pass: "66b54522b4edfd"
              },
          });
          transporter.verify(function (error, success) {
            if (error) {
              console.log(error);
            } else {
              console.log("Server is ready to take our messages");
            }
          });
          const secret = process.env.saltKey;
          const emailTemplate = fs.readFileSync(
            "./src/email-template/email-template.html",
            "utf-8"
            );
            const userName = userInfo.userCode.code;
            const userEmail = userInfo.eMail;
            const token = jwt.sign(userInfo, secret, {
              expiresIn: "900s",
              algorithm: "HS256",
            });
            const mailOptions = {
              from: "shibuyarin365@gmail.com",
              to: userEmail,
              subject: "忘記密碼通知 Forgot Password Notification",
              html: emailTemplate
              .replace("{{ username }}", userName)
              .replace("{{ token }}", "http://localhost:10000/login/" + token),
            };
            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.error(error);
              } else {
                const returnMessage = { success: true };
                console.log("Email sent: " + info.accepted);
              }
            });
            message.ack();
    } catch (error) {
      message.nak();
    }
  }

  @Replier("userAccount.userMail")
  async getUserMail(message: Msg, payload: any, jsonCodec: Codec<any>) {
    const getUserInfo = await this.mongoDB
      .collections("UserAccount")
      .findDocuments({
        "userCode.code": payload.data.userCode,
        eMail: payload.data.eMail,
      });
    const userInfo: UserAccount = getUserInfo[0] as unknown as UserAccount;
    console.log(userInfo);
    if (userInfo) {
      const returnMessage = userInfo.eMail;
      console.log(returnMessage);
      message.respond(jsonCodec.encode(returnMessage));
    } else {
      const returnMessage = "";
      message.respond(jsonCodec.encode(returnMessage));
    }
  }

  @Replier("userAccount.userCode")
  async getUserCode(message: Msg, payload: any, jsonCodec: Codec<any>) {
    try{
      const verifiedToken = jwt.verify(
        payload.data,
        process.env.saltKey
      ) as string;
      if (verifiedToken) {
        const returnMessage = verifiedToken;
        message.respond(jsonCodec.encode(returnMessage));
      } else {
        const returnMessage = "";
        message.respond(jsonCodec.encode(returnMessage));
      }
    }catch(error) {
      const returnMessage = "";
      message.respond(jsonCodec.encode(returnMessage));
    };
  }

  @Subscriber("insertNews")
  insertNews(message: JsMsg, payload: any) {
    try {
      /**payload 排除_id  */
      const { _id, ...resetUserInfo } = payload.data;
      console.log("payload", payload);
      message.ack();
      console.log("payload.userCode", payload.data.userCode);
      // console.log("resetUserInfo",resetUserInfo);
      // console.log("resetUserInfo.userCode", resetUserInfo.userCode)
      this.mongoDB
        .collections("user")
        .collection()
        .updateOne(
          { userCode: payload.data.userCode },
          { $push: { userNews: payload.data } }
        );
      setTimeout(() => {
        this.jetStreamService.publish(
          "userAccount.wantUserNews",
          resetUserInfo
        );
      }, 1000);
    } catch (error) {
      console.error("Error processing order.create: ", error);
      message.nak();
    }
  }

  @Subscriber("wantUserNews")
  newCreateOrder(message: JsMsg, payload: any) {
    try {
      this.orderService.processMessage(payload.data);
      console.log("controller payload", payload);
      console.log("controller 聽到的subject", message.subject);

      console.log("payload.data.userCode", payload.userCode);

      const breakingNews = this.mongoDB
        .collections("user")
        .findDocuments({ userCode: payload.userCode })
        .then((news) => {
          // console.log(x);
          //  這裡拿到mongoDB資料之後要去publish給前端sub做畫面顯示用
          this.jetStreamService.publish("userAccount.getNews.dashboard", news);
          console.log("nats裡news更新後的資料", news);
        });
      console.log(breakingNews);
      message.ack();
    } catch (error) {
      console.error("Error processing order.create: ", error);
      message.nak();
    }
  }

  @Replier("userProfile.find")
  async getUserProfile(message: Msg, payload: any, jsonCodec: Codec<any>) {
    const getUserInfo = await this.mongoDB
    .collections("UserProfile")
    .findDocuments({
      "userCode.code": payload.data.userCode,
      "appId": payload.data.appId,
    });
  const userProfile: UserProfile = getUserInfo[0] as unknown as UserProfile;
  console.log(userProfile)
  if (userProfile) {
    const returnMessage = userProfile;
    console.log(returnMessage);
    message.respond(jsonCodec.encode(returnMessage));
  } else {
    const returnMessage = "";
    message.respond(jsonCodec.encode(returnMessage));
  }
  }

  @Subscriber("userProfile.modify")
  updateUserProfile(message: JsMsg, payload: any) {
    try {
      message.ack();
      this.mongoDB.connect();
      this.mongoDB
        .collections("UserProfile")
        .collection()
        .updateOne(
          { "userCode.code": payload.data.userCode.code,"appId": payload.data.appId },
          { $set:payload.data }
        );
    } catch (error) {
      console.error("Error processing order.create: ", error);
      message.nak();
    }
  }

  @Replier("appStore.myAppStores")
  async getMyAppStores(message: Msg, payload: any, jsonCodec: Codec<any>) {
    
    const pipeline = [
      /**第一階段：篩選符合條件的 UserAppStore 數據 */
      {
        $match: {
          'userCode.code': payload.data
        }
      },
      /**第二階段
       * 從 UserAppStore 集合中關聯 AppStore 數據 
      */
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
      /**第四階段：從 AppStore 中的 home 字段關聯 AppPage 數據 */
      {
        $lookup: {
          from: "AppPage", // 關聯的 collection 名稱
          localField: "appStoreData.home", // 使用 appStoreData 中的 home 字段
          foreignField: "_id", // AppPage 集合中的字段，用於關聯
          as: "appPageData" // 輸出字段的别名
        }
      },
      /**第五階段：輸出所需的欄位 */
      {
        $project: {
          userCode: 1,
          appId: "$appStoreData._id", // 使用 appStoreData 中的 _id
          title: "$appStoreData.title",
          versionNo: "$appStoreData.versionNo",
          type: "$appStoreData.type",
          url: "$appStoreData.url",
          home: {
            $arrayElemAt: ["$appPageData", 0] // appPageData 的第一筆資料
          },
          language: "$appStoreData.language",
          icon: "$appStoreData.icon",
          appPages: {
            $arrayElemAt: ["$appStoreData.appPages", 0] // 提取 appPages 的第一筆資料
          },
          isFavorite: 1 // UserAppStore 中的 isFavorite
        }
      }
    ];

    await this.mongoDB.connect();
    const myAppStore = await this.mongoDB.collections("UserAppStore").aggregateDocuments(pipeline);

     console.log('myAppStore',myAppStore);
    
    if (myAppStore) {
      message.respond(jsonCodec.encode(myAppStore));
      console.log(message.respond(jsonCodec.encode(myAppStore)));
    } 
  }

  @Replier("appStore.userAppStores")
  async getUserAppStore(message: Msg, payload: any, jsonCodec: Codec<any>) {
    
    const userAppStore = await this.mongoDB.collections("UserAppStore").findDocuments({'userCode.code':payload.data});

    if (userAppStore) {
      message.respond(jsonCodec.encode(userAppStore));
      console.log(`userAppStore`,message.respond(jsonCodec.encode(userAppStore)));
    }  else {
      const returnMessage = (`cant find userApp`);
      message.respond(jsonCodec.encode(returnMessage));
    }
  }

  @Subscriber("appStore.userFavorite")
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

  @Subscriber("news.dashboard")
  setaNews(message: JsMsg, payload: any) {
    try {
      console.log("setNews payload", payload);
      console.log("updateStatus payload.data.userCode", payload.data.userCode);
      console.log("updateStatus payload.data.newsId", payload.data.newsId);

      
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

      console.log("tmp", tmp)


      // this.mongoDB.collections("News").updateDocument({userCode:tmp.userCode, _id:tmp._id},{$set:{"execStatus":{code:"60",display:"已讀/已完成"},"execTime": tmpDate}},{upsert:true})
      this.mongoDB.collections("News").updateDocument({userCode:tmp.userCode, _id:tmp._id},{$set:tmp},{upsert:true})
      // setTimeout(()=>{
      //   this.jetStreamService.publish("news.callWantNews", payload.data.userCode);
      // }, 10)
      // this.jetStreamService.publish("news.callWantNews", payload.data.userCode);
      this.jetStreamService.publish(`news.appPortal.${tmp.userCode.code}`, tmp);
      
      
      message.ack();
    } catch (error) {
      console.error("Error processing order.*.*.update: ", error);
      message.nak();
    }
  }

  @Replier("news.find")
  async getNewsList(message: Msg, payload: any, jsonCodec: Codec<any>) {
    
    const orders = await this.orderService.getAllOrders();
    await this.mongoDB.connect();

    const breakingNews = await this.mongoDB
        .collections("News")
        .findDocuments({'userCode':payload.data});
        // .then((news) => {
        //   message.respond(jsonCodec.encode(news)); 
        // });
    message.respond(jsonCodec.encode(breakingNews));
  }

  @Subscriber("news.setNews.>")
  async setNews(message: JsMsg, payload: any) {
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
      await this.mongoDB.collections("News").updateDocument({userCode:tmp.userCode, _id:tmp._id},{$set:tmp},{upsert:true})
    
      message.ack();
    } catch (error) {
      console.error("Error processing appPortal.setNews: ", error);
      message.nak();
    }
  }
}
