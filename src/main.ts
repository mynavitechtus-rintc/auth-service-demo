import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  const configService = app.get(ConfigService);

  // CORS_ORIGIN is a comma-separated allowlist (e.g.
  // "https://app.example.com,https://admin.example.com"). Left unset, we
  // fall back to reflecting the request origin (`true`) so local dev isn't
  // blocked — production deployments should set explicit origins.
  const corsOrigin = configService.get<string>('CORS_ORIGIN', '');
  app.enableCors({
    origin: corsOrigin
      ? corsOrigin.split(',').map((origin) => origin.trim())
      : true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Docs describe the auth system itself (token shapes, revoke semantics) —
  // exposing that publicly in production is its own minor info leak, so this
  // stays off unless explicitly enabled.
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Auth Service API')
      .setDescription(
        'Xác thực bằng JWT access/refresh token, revoke qua whitelist/blacklist trên Redis, phân quyền RBAC.',
      )
      .setVersion('1.0')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Dán access token lấy được từ POST /auth/login hoặc /auth/refresh',
      })
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  const port = configService.get<number>('PORT', 3000);

  await app.listen(port);
}
bootstrap();
