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
  
  
  app.enableCors({
    origin: ['http://localhost:3000', 'https://bejerabu.beget.app'],
    credentials: true,
  });
  
  app.useGlobalPipes(new ValidationPipe());
  
  await app.listen(3001);
}
bootstrap();