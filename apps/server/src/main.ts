import { NestFactory } from "@nestjs/core";
import { loadLocalEnvFile } from "./config/env";
import { AppModule } from "./app.module";

async function bootstrap() {
  loadLocalEnvFile();
  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix("api");
  await app.listen(3001, "127.0.0.1");
}

bootstrap();
