import { AppPageService } from '../app-page/app-page.service';
import {
  Controller,
  Replier,
  Subscriber,
} from '@his-base/jetstream';
import { Codec, JsMsg, Msg } from 'nats';


@Controller('appPage')
export class appPageController {
  
  appPageService: AppPageService; 
  constructor(appPageService = new AppPageService()
  ) {this.appPageService = appPageService;}

  @Subscriber('insert')
    async createappPage(message: JsMsg, payload: any) {
      this.appPageService.create(message,payload.data)
    }

  @Subscriber('update')
    async updateappPage(message: JsMsg, payload: any) {
      this.appPageService.update(message,payload.data)
    }

  @Subscriber('delete')
    async deleteappPage(message: JsMsg, payload: any) {
      this.appPageService.delete(message,payload.data)
    }

  @Replier('list')
  async getappPages(message: Msg, payload: any, jsonCodec: Codec<any>) {
   console.log("show payload", payload.data)
   const appPages = await this.appPageService.get()
   console.log(appPages);
   message.respond(jsonCodec.encode(appPages));
  }
}
