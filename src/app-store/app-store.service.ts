import { JetStreamServiceProvider } from '@his-base/jetstream';
import {MongoBaseService, MongoServiceProvider } from '@his-base/mongo-base';
import { Injectable } from '@nestjs/common';
import { Codec, JsMsg, Msg } from 'nats';

@Injectable()
export class AppStoreService {
  mongoService: MongoBaseService;
  jetStreamService = JetStreamServiceProvider.get();
  constructor(mongoService = new MongoBaseService('mongodb://localhost:27017', 'AppStoreDatabase')
) {this.mongoService = mongoService;}
    // 新增資料
    create(message: JsMsg, payload: any){
    try {
        console.log(payload)
        this.mongoService.collections('appStore').insertDocument(payload)
        message.ack();
    } catch (error) {
        console.error('Error processing appStore.create: ', error);
        message.nak();
    }
    }

    // 更新資料
    update(message: JsMsg, payload: any){
        try { 
            console.log('Processing time update', payload);
            this.mongoService.collections('appStore').collection.updateOne({_id: payload._id}, {$set:payload})
            message.ack();
        } catch (error) {
            console.error('Error processing appStore.update: ', error);
            message.nak();
        }
    }

    // 刪除資料
    delete(message: JsMsg, payload: any){
    try { 
        console.log('Processing time delete', payload);
        this.mongoService.collections('appStore').collection.deleteOne({_id: payload._id})
        message.ack();
      } catch (error) {
        console.error('Error processing appStore.delete: ', error);
        message.nak();
      }
    }    
    // 搜尋所有資料
    async getList(message: Msg, payload: any, jsonCodec: Codec<any>){
      const appPages = await this.mongoService.collections('appStore').findDocuments({})
      console.log(appPages);
      message.respond(jsonCodec.encode(appPages));
    }
    
    // 搜尋特定資料
    async search(message: Msg, payload: any, jsonCodec: Codec<any>){
        try { 
            console.log('Processing time search', payload);
            const appPages = await this.mongoService.collections('appStore').findDocuments({appType: payload})
            console.log(appPages)
            message.respond(jsonCodec.encode(appPages));
          } 
        catch (error) {
          console.error('Error processing appStore.list: ', error);
        }
    }
    // 搜尋特定資料
    async get(message: Msg, payload: any, jsonCodec: Codec<any>){
      const appPages = await this.mongoService.collections('appStore').collection.findOne({_id: payload})
      console.log(appPages);
      message.respond(jsonCodec.encode(appPages));
    }
  }
  