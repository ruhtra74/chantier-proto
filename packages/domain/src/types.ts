import type { z } from "zod";
import type {
  domainCommandSchema,
  engineEventSchema,
  gameResultSchema,
  gameStateSchema,
  logEntrySchema,
  scenarioSchema,
  sessionCreatedSchema,
  sessionDetailSchema,
  sessionSubmissionSchema,
  sessionSummarySchema,
} from "./schemas";

export type Scenario = z.infer<typeof scenarioSchema>;
export type EngineEvent = z.infer<typeof engineEventSchema>;
export type DomainCommand = z.infer<typeof domainCommandSchema>;
export type GameResult = z.infer<typeof gameResultSchema>;
export type GameState = z.infer<typeof gameStateSchema>;
export type LogEntry = z.infer<typeof logEntrySchema>;
export type SessionSubmission = z.infer<typeof sessionSubmissionSchema>;
export type SessionCreated = z.infer<typeof sessionCreatedSchema>;
export type SessionSummary = z.infer<typeof sessionSummarySchema>;
export type SessionDetail = z.infer<typeof sessionDetailSchema>;

export type ReduceResult = {
  state: GameState;
  commands: DomainCommand[];
};
