import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OpenaiService {
  private readonly openaiBaseUrl = 'https://api.openai.com/v1';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async proxyToOpenAI(
    endpoint: string,
    body: any,
    authHeader?: string,
  ): Promise<any> {
    try {
      // Используем API ключ из заголовка или из конфига
      const apiKey = authHeader?.replace('Bearer ', '') || 
                    this.configService.get('OPENAI_API_KEY');

      if (!apiKey) {
        throw new HttpException('OpenAI API key is required', HttpStatus.UNAUTHORIZED);
      }

      const url = `${this.openaiBaseUrl}/${endpoint}`;
      
      console.log(`Proxying to OpenAI: ${endpoint}`);
      
      const config: any = {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        timeout: 60000, // Увеличим таймаут до 60 секунд
      };

      let response: AxiosResponse;

      if (endpoint === 'audio/transcriptions') {
        // Для транскрипции используем FormData
        config.headers['Content-Type'] = 'multipart/form-data';
        response = await firstValueFrom(
          this.httpService.post(url, body, config),
        );
      } else if (endpoint === 'audio/speech') {
        // Для TTS возвращаем бинарные данные
        config.responseType = 'arraybuffer';
        config.headers['Content-Type'] = 'application/json';
        response = await firstValueFrom(
          this.httpService.post(url, body, config),
        );
        return Buffer.from(response.data);
      } else {
        // Для chat/completions
        config.headers['Content-Type'] = 'application/json';
        response = await firstValueFrom(
          this.httpService.post(url, body, config),
        );
      }

      console.log(`OpenAI ${endpoint} success`);
      return response.data;

    } catch (error: any) {
      console.error(`OpenAI ${endpoint} error:`, {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      if (error.code === 'ECONNREFUSED') {
        throw new HttpException('Cannot connect to OpenAI API', HttpStatus.SERVICE_UNAVAILABLE);
      }
      
      if (error.response?.status === 429) {
        throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
      }
      
      if (error.response?.status === 401) {
        throw new HttpException('Invalid API key', HttpStatus.UNAUTHORIZED);
      }
      
      throw new HttpException(
        error.response?.data?.error?.message || 'OpenAI service error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}