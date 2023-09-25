import { JetStreamServiceProvider } from '@his-base/jetstream';
import { MongoBaseService } from '@his-base/mongo-base';
import { Injectable } from '@nestjs/common';
import { Codec, JsMsg, Msg } from 'nats';

@Injectable()
export class AppPageService {
    mongoService: MongoBaseService;
    jetStreamService = JetStreamServiceProvider.get();
    constructor(mongoService = new MongoBaseService('mongodb://localhost:27017', 'AppPageDatabase')
  ) {this.mongoService = mongoService;}

    // 新增資料
    async create(message: JsMsg, payload: any){
    try {
        console.log(payload)
        await this.mongoService.connect()
        await this.mongoService.collections('appPage').insertDocument(payload)
        this.mongoService.close()
        message.ack();
    } catch (error) {
        console.error('Error processing appPage.create: ', error);
        message.nak();
    }
    }

    // 更新資料
    async update(message: JsMsg, payload: any){
        try { 
            console.log('Processing time update', payload);
            await this.mongoService.connect()
            await this.mongoService.collections('appPage').collection().updateOne({_id: payload._id}, {$set:payload})
            this.mongoService.close
            message.ack();
        } catch (error) {
            console.error('Error processing appPage.update: ', error);
            message.nak();
        }
    }

    // 刪除資料
    async delete(message: JsMsg, payload: any){
    try { 
        console.log('Processing time delete', payload);
        await this.mongoService.connect();
        await this.mongoService.collections('appPage').collection().deleteOne({_id : payload._id}); 
        this.mongoService.close();
        message.ack();
      } catch (error) {
        console.error('Error processing appPage.delete: ', error);
        message.nak();
      }
    }

    // 拿到所有資料
    async sub(message: JsMsg, payload: any){
        try { 
            console.log('Processing time sub', payload);
            await this.mongoService.connect();
            const appPages = await this.mongoService.collections('appPage').findDocuments({})
            this.mongoService.close()
            console.log(appPages)
            message.ack();
          } catch (error) {
            console.error('Error processing appPage.list: ', error);
            message.nak();
          }
    }

    // 搜尋特定資料
    async search(message: Msg, payload: any, jsonCodec: Codec<any>){
        console.log(payload)
        const appPages = await this.mongoService.collections('appPage').findDocuments({[payload.searchType]: payload.searchValue})
        console.log(appPages)
        message.respond(jsonCodec.encode(appPages));
    }

    // 取得所有資料（request/reply）
    async get(){
        await this.mongoService.connect()
        const appPages = await this.mongoService.collections('appPage').findDocuments({})
        console.log(appPages)
        this.mongoService.close()
        return appPages
    }

}
