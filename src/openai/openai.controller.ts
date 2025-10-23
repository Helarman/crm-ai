// openai.controller.ts
import { 
  Controller, 
  Post, 
  Headers, 
  Res, 
  UseInterceptors, 
  UploadedFile, 
  Body,
  Options 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { Express } from 'express';
import { OpenaiService } from './openai.service';

// Создаем тип для файла
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

@Controller('openai')
export class OpenaiController {
  constructor(private readonly openaiService: OpenaiService) {}

  // Обработка preflight OPTIONS запросов
  @Options()
  handleOptions(@Res() res: Response) {
    res.header('Access-Control-Allow-Origin', 'https://bejerabu.beget.app');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.status(200).send();
  }

  // Используем FileInterceptor для обработки multipart/form-data
  @Post('audio/transcriptions')
  @UseInterceptors(FileInterceptor('file'))
  async transcribeAudio(
    @UploadedFile() file: MulterFile,
    @Body() body: any,
    @Headers('authorization') authHeader: string,
    @Res() res: Response,
  ) {
    try {
      console.log('Received audio transcription request:', {
        fileName: file?.originalname,
        fileSize: file?.size,
        mimetype: file?.mimetype,
        body: body
      });

      if (!file) {
        throw new Error('No audio file provided');
      }

      // Создаем FormData для отправки в OpenAI
      const FormData = require('form-data');
      const formData = new FormData();
      
      // Добавляем файл в FormData
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype
      });
      formData.append('model', body.model || 'whisper-1');
      
      if (body.language) {
        formData.append('language', body.language);
      }
      if (body.prompt) {
        formData.append('prompt', body.prompt);
      }
      if (body.response_format) {
        formData.append('response_format', body.response_format);
      }

      const result = await this.openaiService.proxyToOpenAI(
        'audio/transcriptions',
        formData,
        authHeader,
      );
      
      res.header('Access-Control-Allow-Origin', 'https://bejerabu.beget.app');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.status(200).json(result);
    } catch (error) {
      console.error('Audio transcription error:', error);
      res.header('Access-Control-Allow-Origin', 'https://bejerabu.beget.app');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.status(error.response?.status || 500).json({
        error: error.message,
        details: error.response?.data,
      });
    }
  }

  // Остальные методы остаются без изменений
  @Post('chat/completions')
  async chatCompletion(
    @Body() body: any,
    @Headers('authorization') authHeader: string,
    @Res() res: Response,
  ) {
    try {
      console.log('Received chat completion request:', { 
        body: JSON.stringify(body).substring(0, 200),
        hasAuth: !!authHeader 
      });

      const result = await this.openaiService.proxyToOpenAI(
        'chat/completions',
        body,
        authHeader,
      );
      
      res.header('Access-Control-Allow-Origin', 'https://bejerabu.beget.app');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.status(200).json(result);
    } catch (error) {
      console.error('Chat completion error:', error);
      res.header('Access-Control-Allow-Origin', 'https://bejerabu.beget.app');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.status(error.response?.status || 500).json({
        error: error.message,
        details: error.response?.data,
      });
    }
  }

  @Post('audio/speech')
  async textToSpeech(
    @Body() body: any,
    @Headers('authorization') authHeader: string,
    @Res() res: Response,
  ) {
    try {
      console.log('Received TTS request:', { 
        text: body.input?.substring(0, 100) 
      });
      
      const result = await this.openaiService.proxyToOpenAI(
        'audio/speech',
        body,
        authHeader,
      );
      
      res.header('Access-Control-Allow-Origin', 'https://bejerabu.beget.app');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(result);
    } catch (error) {
      console.error('TTS error:', error);
      res.header('Access-Control-Allow-Origin', 'https://bejerabu.beget.app');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.status(error.response?.status || 500).json({
        error: error.message,
        details: error.response?.data,
      });
    }
  }
}