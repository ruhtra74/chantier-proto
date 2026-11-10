import type { z } from "zod";
import type {
  domainCommandSchema,
  engineEventSchema,
  gameResultSchema,
  gameStateSchema,
  logEntrySchema,
  scenarioSchema,
  sessionSubmissionSchema,
} from "./schemas";

export type Scenario = z.infer<typeof scenarioSchema>;
export type EngineEvent = z.infer<typeof engineEventSchema>;
export type DomainCommand = z.infer<typeof domainCommandSchema>;
export type GameResult = z.infer<typeof gameResultSchema>;
export type GameState = z.infer<typeof gameStateSchema>;
export type LogEntry = z.infer<typeof logEntrySchema>;
export type SessionSubmission = z.infer<typeof sessionSubmissionSchema>;

export type ReduceResult = {
  state: GameState;
  commands: DomainCommand[];
};
