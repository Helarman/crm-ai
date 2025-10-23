import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenaiController } from './openai/openai.controller';
import { OpenaiService } from './openai/openai.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    ConfigModule.forRoot(),
    HttpModule,
  ],
  controllers: [OpenaiController],
  providers: [OpenaiService],
})
export class AppModule {}