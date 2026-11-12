import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { configureApp } from "./app.setup.js";
import { AppModule } from "./app.module.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  const port = Number(process.env["PORT"] ?? 3000);
  await app.listen(port);
  console.log(`API du prototype : http://localhost:${port}/api`);
}

await bootstrap();
