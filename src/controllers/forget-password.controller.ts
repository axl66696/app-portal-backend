import {
  Controller,
  JetStreamServiceProvider,
  Replier,
  Subscriber,
} from "@his-base/jetstream";
import nodemailer from 'nodemailer';
import fs from 'fs'
import { MongoBaseService } from "@his-base/mongo-base";
import { Codec, JsMsg, Msg } from "nats";
import { UserAccount } from "./types/user-account";
import jwt from 'jsonwebtoken';


@Controller("forgetPasswordUser")
export class forgetPasswordUserController {
  jetStreamService = JetStreamServiceProvider.get();

  mongoDB = new MongoBaseService("mongodb://localhost:27017", "UserDatabase");
  constructor(
  ) {
  }

  //處理前端申請忘記密碼
  @Replier("apply")
  async apply( message: Msg, payload: any, jsonCodec: Codec<any>) {
    try{
    console.log(payload.userCode)
    const getUserInfo = await this.mongoDB
      .collections("user")
      .findDocuments({'userCode':payload.data.userCode,'eMail':payload.data.eMail});
    const userInfo:UserAccount=getUserInfo[0] as unknown as UserAccount
    console.log(userInfo)

    if(userInfo){
      const returnMessage = {success:true}
      message.respond(jsonCodec.encode(returnMessage));
      const transporter = nodemailer.createTransport({
              service: 'Gmail', // 例如，'Gmail' 或 'SMTP'
        auth: {
          user: 'h34076144@gs.ncku.edu.tw', // 你的電子郵件地址
          pass: 'mmhz nyso oizj goxs'     // 你的電子郵件密碼
        }})
        const secret = process.env.saltKey;
        const emailTemplate = fs.readFileSync('./src/email-template/email-template.html', 'utf-8');
        const userName = userInfo.userCode
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
    }
    else{
      const returnMessage = {success:false}
      console.log(returnMessage)
      message.respond(jsonCodec.encode(returnMessage));
    }}
    catch(error)
    {
      const returnMessage = {success:false}
      console.log(returnMessage)
      message.respond(jsonCodec.encode(returnMessage));
    }
  }

  //授權進入修改密碼的畫面
  @Replier("auth")
  async auth(message: Msg, payload: any, jsonCodec: Codec<any>) {
    try{
      const verifiedToken = jwt.verify(payload.data, process.env.saltKey) as UserAccount;  
      console.log(verifiedToken)
      const getUserInfo = await this.mongoDB
      .collections("user")
      .findDocuments({'userCode':verifiedToken.userCode,"passwordHash":verifiedToken.passwordHash});
      const userInfo:UserAccount=getUserInfo[0] as unknown as UserAccount
      console.log(userInfo)
      if(userInfo){
        const returnMessage = {auth:true,userAccount: userInfo as UserAccount}
        message.respond(jsonCodec.encode(returnMessage));
      }
      else{
        const returnMessage = {auth:false,userAccount: "no user" as any}
        message.respond(jsonCodec.encode(returnMessage));
      }
  }
  catch(error){
    const returnMessage = {auth:false,userAccount: "invalid url" as any}
    message.respond(jsonCodec.encode(returnMessage));
  }
  }

  // @Subscriber("update")
  // async update(message: JsMsg, payload: any){
  //   try {

  //     /**payload 排除_id  */
  //     const { _id, ...resetUserInfo } = payload;
  //     message.ack();
  //     this.mongoDB.collections("user").collection.updateOne({userCode: payload.userCode}, {$set:{passwordHash:resetUserInfo.passwordHash}});
   
  //   } catch (error) {
  //     console.error('Error processing order.create: ', error);
  //     message.nak();
  //   }
  // }
}
