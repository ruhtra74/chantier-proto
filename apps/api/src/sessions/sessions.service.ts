import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { LogEntry, SessionSubmission } from "@chantier/domain";
import { PrismaService } from "../prisma/prisma.service.js";
import { verifySession } from "./verify-session.js";

export type SessionCreated = {
  id: string;
  serverScore: number;
  verified: boolean;
  status: string;
  reason: string | null;
};

export type SessionSummary = {
  id: string;
  createdAt: Date;
  scenarioId: string;
  status: string;
  reason: string | null;
  score: number;
  verified: boolean;
};

export type SessionDetail = {
  id: string;
  userId: string;
  createdAt: Date;
  scenarioId: string;
  scenarioVersion: number;
  status: string;
  reason: string | null;
  clientScore: number;
  serverScore: number;
  verified: boolean;
  durationMs: number;
  events: LogEntry[];
};

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(submission: SessionSubmission): Promise<SessionCreated> {
    const result = verifySession(submission);
    if (!result.ok) throw new BadRequestException(result.message);

    const { status, reason, serverScore, verified } = result.verification;
    const session = await this.prisma.session.create({
      data: {
        scenarioId: submission.scenarioId,
        scenarioVersion: submission.scenarioVersion,
        status,
        reason,
        clientScore: submission.client.score,
        serverScore,
        verified,
        durationMs: submission.durationMs,
        eventsJson: JSON.stringify(submission.events),
      },
    });

    return { id: session.id, serverScore, verified, status, reason };
  }

  async list(): Promise<SessionSummary[]> {
    const sessions = await this.prisma.session.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        scenarioId: true,
        status: true,
        reason: true,
        serverScore: true,
        verified: true,
      },
    });
    return sessions.map(({ serverScore, ...rest }) => ({ ...rest, score: serverScore }));
  }

  async findOne(id: string): Promise<SessionDetail> {
    const session = await this.prisma.session.findUnique({ where: { id } });
    if (!session) throw new NotFoundException(`Session inconnue : ${id}`);

    const { eventsJson, ...rest } = session;
    return { ...rest, events: JSON.parse(eventsJson) as LogEntry[] };
  }
}
