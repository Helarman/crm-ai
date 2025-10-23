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

 async proxyToOpenAI(endpoint: string, body: any, authHeader?: string): Promise<any> {
  try {
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
        'User-Agent': 'CRM-AI-Server/1.0',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      },
      timeout: 30000,
      httpsAgent: new (require('https')).Agent({
        keepAlive: true,
        maxSockets: 50,
        keepAliveMsecs: 10000,
        // Важные настройки для SNI
        servername: 'api.openai.com',
        rejectUnauthorized: true
      }),
      // Явно указать hostname для SNI
      baseURL: 'https://api.openai.com',
      // Отключить редиректы
      maxRedirects: 0
    };

    let response: AxiosResponse;

    if (endpoint === 'audio/transcriptions') {
      config.headers['Content-Type'] = 'multipart/form-data';
      // Для FormData используем специальный обработчик
      const FormData = require('form-data');
      if (body instanceof FormData) {
        config.headers = {
          ...config.headers,
          ...body.getHeaders() // Получаем правильные заголовки для FormData
        };
      }
    } else {
      config.headers['Content-Type'] = 'application/json';
    }

    response = await firstValueFrom(
      this.httpService.post(url, body, config),
    );

    console.log(`OpenAI ${endpoint} success`);
    return response.data;

  } catch (error: any) {
    console.error(`OpenAI ${endpoint} error:`, {
      status: error.response?.status,
      headers: error.response?.headers,
      data: error.response?.data,
      message: error.message,
      code: error.code
    });
    
    if (error.response?.status === 421) {
      throw new HttpException(
        'OpenAI API: SSL/TLS handshake failed. Check SNI configuration.',
        HttpStatus.BAD_GATEWAY
      );
    }
    
    throw new HttpException(
      error.response?.data?.error?.message || 'OpenAI service error',
      error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
}