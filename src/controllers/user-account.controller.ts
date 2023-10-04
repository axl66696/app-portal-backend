import {
  Controller,
  JetStreamServiceProvider,
  Replier,
  Subscriber,
} from "@his-base/jetstream";
import { MongoBaseService } from "@his-base/mongo-base";
import { OrderService } from "@his-model/nats-oriented-services";
import { Codec, JsMsg, Msg } from "nats";
import { UserAccount } from "@his-viewmodel/app-portal";
import nodemailer from "nodemailer";
import fs from "fs";
import jwt from "jsonwebtoken";

@Controller("UserAccount")
export class UserAccountController {
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

  @Subscriber("update.userFavorite")
  async updateUserFavorite(message: JsMsg, payload: any) {
    try {
      /**payload 排除_id  */

      const { _id, ...resetUserInfo } = payload.data;
      message.ack();
      this.mongoDB
        .collections("user")
        .collection()
        .updateOne(
          { userCode: payload.data.userCode },
          { $set: resetUserInfo }
        );
    } catch (error) {
      console.error("Error processing order.create: ", error);
      message.nak();
    }
  }

  @Replier("GetUserToken")
  async getUserToken(message: Msg, payload: any, jsonCodec: Codec<any>) {
    console.log(payload.data.userCode.code)
    const getUserInfo = await this.mongoDB
      .collections("UserAccount")
      .findDocuments({"userCode.code": payload.data.userCode.code, "passwordHash": payload.data.passwordHash, "hospital.display": payload.data.orgNo});
    const userInfo:UserAccount=getUserInfo[0] as unknown as UserAccount
    console.log(userInfo)

    if(userInfo){
      const secret = process.env.saltKey;
      const token= jwt.sign(payload.data, secret, { expiresIn: '30d', algorithm: 'HS256' });
      const returnMessage = {userCode: userInfo.userCode, token: token}
      message.respond(jsonCodec.encode(returnMessage));
    }
    else{
      const returnMessage = {userCode: {},token: ''}
      message.respond(jsonCodec.encode(returnMessage));
    }
  }

  @Replier("GetUserAccount")
  async getUserAccount(message: Msg, payload: any, jsonCodec: Codec<any>) {
    console.log(payload)
    const getUserInfo = await this.mongoDB
      .collections("UserAccount")
      .findDocuments({"userCode.code": payload.data});
    // console.log("userInfo", getUserInfo);
    const userInfo:UserAccount=getUserInfo[0] as unknown as UserAccount
    console.log(userInfo)
    if(userInfo){
      const returnMessage = {userAccount: userInfo as UserAccount}
      message.respond(jsonCodec.encode(returnMessage));
    }
    else{
      const returnMessage = {userAccount: {}}
      message.respond(jsonCodec.encode(returnMessage));
    }
  }

  @Subscriber("UpdatePassword")
  createOrder(message: JsMsg, payload: any) {
    try {
      message.ack();
      this.mongoDB.connect();
      this.mongoDB
        .collections("UserAccount")
        .collection()
        .updateOne(
          { "userCode.code": payload.data.userCode },
          { $set: {"passwordHash": payload.data.passwordHash} }
        );
    } catch (error) {
      console.error("Error processing order.create: ", error);
      message.nak();
    }
  }

  @Subscriber("SendMail")
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
      const transporter = nodemailer.createTransport({
        service: 'Gmail', // 例如，'Gmail' 或 'SMTP'
  auth: {
    user: 'h34076144@gs.ncku.edu.tw', // 你的電子郵件地址
    pass: 'mmhz nyso oizj goxs'     // 你的電子郵件密碼
  }})
  const secret = process.env.saltKey;
  const emailTemplate = fs.readFileSync('./src/email-template/email-template.html', 'utf-8');
  const userName = userInfo.userCode.code
  const userEmail = userInfo.eMail
  const token = jwt.sign(userInfo, secret, { expiresIn: '900s', algorithm: 'HS256' });
  const mailOptions = {
    from: 'h34076144@gs.ncku.edu.tw',
    to: userEmail,
    subject: '忘記密碼通知 Forgot Password Notification',
    html: emailTemplate.replace('{{ username }}', userName).replace('{{ token }}', 'http://localhost:10000/login/'+token)
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      // const returnMessage = {success:false}
      // message.respond(jsonCodec.encode(returnMessage));
    } 
    else {
      const returnMessage = {success:true}
      console.log('Email sent: ' + returnMessage);
    }
  });
      message.ack();
    } catch (error) {
      message.nak();
    }
  }

  @Replier("GetUserMail")
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

  @Replier("GetUserCode")
  async getUserCode(message: Msg, payload: any, jsonCodec: Codec<any>) {
    const verifiedToken = jwt.verify(payload.data, process.env.saltKey) as string
    if(verifiedToken) {
      const returnMessage = verifiedToken
      message.respond(jsonCodec.encode(returnMessage));
    }
    else {
      const returnMessage = ''
      message.respond(jsonCodec.encode(returnMessage));
    }
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
}
