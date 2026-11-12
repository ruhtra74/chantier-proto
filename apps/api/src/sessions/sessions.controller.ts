import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import {
  sessionSubmissionSchema,
  type SessionCreated,
  type SessionDetail,
  type SessionSubmission,
  type SessionSummary,
} from "@chantier/domain";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { SessionsService } from "./sessions.service.js";

@Controller("sessions")
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(sessionSubmissionSchema)) submission: SessionSubmission,
  ): Promise<SessionCreated> {
    return this.sessions.create(submission);
  }

  @Get()
  list(): Promise<SessionSummary[]> {
    return this.sessions.list();
  }

  @Get(":id")
  findOne(@Param("id") id: string): Promise<SessionDetail> {
    return this.sessions.findOne(id);
  }
}
