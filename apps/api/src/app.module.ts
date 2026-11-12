import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module.js";
import { ScenariosModule } from "./scenarios/scenarios.module.js";
import { SessionsModule } from "./sessions/sessions.module.js";

@Module({
  imports: [PrismaModule, ScenariosModule, SessionsModule],
})
export class AppModule {}
