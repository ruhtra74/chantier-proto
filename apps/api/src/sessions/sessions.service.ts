import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  LogEntry,
  SessionCreated,
  SessionDetail,
  SessionSubmission,
  SessionSummary,
} from "@chantier/domain";
import { PrismaService } from "../prisma/prisma.service.js";
import { verifySession } from "./verify-session.js";

/** Les contrats de réponse sont ceux du paquet `domain`, que le front valide avec Zod. */
type Reason = SessionCreated["reason"];
type Status = SessionCreated["status"];

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
    return sessions.map(({ serverScore, createdAt, status, reason, ...rest }) => ({
      ...rest,
      createdAt: createdAt.toISOString(),
      status: status as Status,
      reason: reason as Reason,
      score: serverScore,
    }));
  }

  async findOne(id: string): Promise<SessionDetail> {
    const session = await this.prisma.session.findUnique({ where: { id } });
    if (!session) throw new NotFoundException(`Session inconnue : ${id}`);

    const { eventsJson, createdAt, status, reason, ...rest } = session;
    return {
      ...rest,
      createdAt: createdAt.toISOString(),
      status: status as Status,
      reason: reason as Reason,
      events: JSON.parse(eventsJson) as LogEntry[],
    };
  }
}
