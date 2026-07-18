import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import * as bodyParser from "body-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(bodyParser.json({ limit: "10mb" }));
  app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

  app.enableCors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
          transformOptions: {
      enableImplicitConversion: true,
    },
    }),
  );

  app.setGlobalPrefix("api");

  const port = process.env.PORT || 4000;
  await app.listen(port, "0.0.0.0");
  console.log(`🚀 Backend running on http://localhost:${port}/api`);
}
bootstrap();
