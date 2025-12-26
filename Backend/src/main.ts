import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config'; 
import * as session from 'express-session';
import * as passport from 'passport';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const frontendUrl = configService.get<string>('FRONTEND_URL');

  // Enable CORS using the environment variable
  app.enableCors({
    origin: frontendUrl, // ✅ Use the variable here
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });
   app.use(cookieParser());
  // Enables class-validator and class-transformer for all incoming requests
  app.useGlobalPipes(new ValidationPipe());

  // Enables cookie parsing for all incoming requests
 
  
  const port = configService.get<number>('PORT') || 4000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
