import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { configureApp } from "./app.setup.js";
import { AppModule } from "./app.module.js";
import { serveWebApp } from "./web-app.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  const webDir = serveWebApp(app);
  const port = Number(process.env["PORT"] ?? 3000);
  await app.listen(port);
  console.log(`API du prototype : http://localhost:${port}/api`);
  if (webDir) console.log(`Application web servie depuis ${webDir} : http://localhost:${port}/`);
}

await bootstrap();
