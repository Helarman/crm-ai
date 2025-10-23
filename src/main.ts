// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const apiKey = configService.get('OPENAI_API_KEY');
  
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
  } else if (!apiKey.startsWith('sk-')) {
    console.error('❌ Invalid OPENAI_API_KEY format');
  } else {
    console.log('✅ OpenAI API key loaded successfully');
  }
  
  // Настройка CORS с более детальными параметрами
  app.enableCors({
    origin: ['http://localhost:3000', 'https://bejerabu.beget.app', 'https://jukirililuk.beget.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
  });
  
  // Глобальный обработчик OPTIONS запросов
  app.use((req: any, res: any, next: any) => {
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Origin', req.headers.origin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Max-Age', '86400');
      res.status(204).send();
    } else {
      next();
    }
  });
  
  app.useGlobalPipes(new ValidationPipe());
  
  await app.listen(3001);
  console.log('🚀 Server running on http://localhost:3001');
}
bootstrap();