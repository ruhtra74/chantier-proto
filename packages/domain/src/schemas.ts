import { z } from "zod";

/** Nombre fini : rejette NaN et ±Infinity. */
const finite = z.number().refine(Number.isFinite, { message: "Nombre fini attendu" });
const positiveFinite = finite.refine((value) => value > 0, {
  message: "Valeur strictement positive attendue",
});
const nonNegativeFinite = finite.refine((value) => value >= 0, {
  message: "Valeur positive ou nulle attendue",
});

export const coneSchema = z.object({
  id: z.string().min(1, "Identifiant de cône requis"),
  x: finite,
  z: finite,
});

export const scenarioSchema = z
  .object({
    id: z.string().min(1, "Identifiant de scénario requis"),
    version: z.number().int().positive(),
    fuel: z.object({
      capacity: positiveFinite,
      consumptionPerMeter: positiveFinite,
    }),
    scoring: z.object({
      base: z.number().int().nonnegative(),
      penaltyPerConeHit: z.number().int().nonnegative(),
      bonusPerFuelUnit: z.number().int().nonnegative(),
    }),
    start: z.object({
      x: finite,
      z: finite,
      headingDeg: finite,
    }),
    target: z.object({
      x: finite,
      z: finite,
      radius: positiveFinite,
    }),
    cones: z.array(coneSchema).min(1, "Au moins un cône est requis"),
  })
  .superRefine((scenario, ctx) => {
    const seen = new Set<string>();
    scenario.cones.forEach((cone, index) => {
      if (seen.has(cone.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["cones", index, "id"],
          message: `Identifiant de cône dupliqué : ${cone.id}`,
        });
      }
      seen.add(cone.id);
    });
  });

// moteur -> domaine
export const engineEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("MOVED"), distance: nonNegativeFinite }),
  z.object({ type: z.literal("CONE_HIT"), id: z.string().min(1, "Identifiant de cône requis") }),
  z.object({ type: z.literal("REACHED_TARGET") }),
]);

// domaine -> moteur et interface
export const domainCommandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("UPDATE_HUD"),
    fuel: nonNegativeFinite,
    conesHit: z.number().int().nonnegative(),
    distance: nonNegativeFinite,
  }),
  z.object({
    type: z.literal("END"),
    reason: z.enum(["arrivee", "panne_seche"]),
    score: z.number().int().nonnegative(),
  }),
]);

export const gameResultSchema = z.object({
  reason: z.enum(["arrivee", "panne_seche"]),
  score: z.number().int().nonnegative(),
});

export const gameStateSchema = z.object({
  status: z.enum(["running", "finished"]),
  fuel: nonNegativeFinite,
  distance: nonNegativeFinite,
  conesHit: z.array(z.string()),
  result: gameResultSchema.optional(),
});

/** t : millisecondes depuis le début de la partie (informatif). */
export const logEntrySchema = z.object({
  t: z.number().int().nonnegative(),
  event: engineEventSchema,
});

export const sessionSubmissionSchema = z.object({
  scenarioId: z.string().min(1),
  scenarioVersion: z.number().int().positive(),
  events: z.array(logEntrySchema),
  client: z.object({
    status: z.enum(["running", "finished"]),
    reason: z.enum(["arrivee", "panne_seche"]).optional(),
    score: z.number().int().nonnegative(),
  }),
  durationMs: z.number().int().nonnegative(),
});

// Réponses de l'API (préfixe /api), validées par le front.
const gameReasonSchema = z.enum(["arrivee", "panne_seche"]);

/** Réponse de `POST /api/sessions` : issue recalculée par le serveur. */
export const sessionCreatedSchema = z.object({
  id: z.string().min(1),
  serverScore: z.number().int().nonnegative(),
  verified: z.boolean(),
  status: z.enum(["running", "finished"]),
  reason: gameReasonSchema.nullable(),
});

/** Élément de `GET /api/sessions`. `score` est le score du serveur. */
export const sessionSummarySchema = z.object({
  id: z.string().min(1),
  createdAt: z.iso.datetime(),
  scenarioId: z.string().min(1),
  status: z.enum(["running", "finished"]),
  reason: gameReasonSchema.nullable(),
  score: z.number().int().nonnegative(),
  verified: z.boolean(),
});

export const sessionListSchema = z.array(sessionSummarySchema);

/** Réponse de `GET /api/sessions/:id`, journal d'événements compris. */
export const sessionDetailSchema = z.object({
  id: z.string().min(1),
  userId: z.string(),
  createdAt: z.iso.datetime(),
  scenarioId: z.string().min(1),
  scenarioVersion: z.number().int().positive(),
  status: z.enum(["running", "finished"]),
  reason: gameReasonSchema.nullable(),
  clientScore: z.number().int().nonnegative(),
  serverScore: z.number().int().nonnegative(),
  verified: z.boolean(),
  durationMs: z.number().int().nonnegative(),
  events: z.array(logEntrySchema),
});
