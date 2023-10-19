import {
  Controller,
  JetStreamServiceProvider,
  Replier,
} from "@his-base/jetstream";
import { MongoBaseService } from "@his-base/mongo-base";
import { UserImage } from "@his-viewmodel/app-portal";
import { Codec, Msg } from "nats";
@Controller("UserImage")
export class UserImageController {
  jetStreamService = JetStreamServiceProvider.get();

  mongoDB = new MongoBaseService("mongodb://localhost:27017", "AppPortal");

  constructor() {}

  @Replier("getUserImage")
  async getUserImage(message: Msg, payload: any, jsonCodec: Codec<any>) {
    console.log(payload.data);

    await this.mongoDB.connect();

    const getUserImage = await this.mongoDB
      .collections("UserImage")
      .collection()
      .find({ "userCode.code": payload.data })
      .toArray();
    // console.log("userInfo", getUserInfo);

    const userImage: UserImage = getUserImage[0] as unknown as UserImage;
    console.log(userImage);
    if (userImage) {
      const returnMessage = userImage;
      message.respond(jsonCodec.encode(returnMessage));
    } else {
      const returnMessage = {};
      message.respond(jsonCodec.encode(returnMessage));
    }
  }
}
