import "reflect-metadata";
import { Test } from "@nestjs/testing";
import type { NestExpressApplication } from "@nestjs/platform-express";
import {
  chantier1,
  sessionCreatedSchema,
  sessionDetailSchema,
  sessionListSchema,
} from "@chantier/domain";
import request from "supertest";
import type { App } from "supertest/types.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/app.setup.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { arrivalEvents, honestSubmission } from "./fixtures.js";

describe("API (section 10.2)", () => {
  let app: NestExpressApplication;
  let server: App;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
    configureApp(app);
    await app.init();
    await app.get(PrismaService).session.deleteMany();
    server = app.getHttpServer() as App;
  });

  afterAll(async () => {
    await app.close();
  });

  it("A1 — GET /api/scenarios/chantier-1 retourne le scénario", async () => {
    const response = await request(server).get("/api/scenarios/chantier-1").expect(200);
    expect(response.body).toEqual(chantier1);
  });

  it("A1 bis — un scénario inconnu donne 404", async () => {
    await request(server).get("/api/scenarios/inconnu").expect(404);
  });

  let verifiedId: string;

  it("A2 — un journal cohérent donne verified = true", async () => {
    const response = await request(server)
      .post("/api/sessions")
      .send(honestSubmission())
      .expect(201);

    expect(response.body).toMatchObject({
      serverScore: 1235,
      verified: true,
      status: "finished",
      reason: "arrivee",
    });
    expect(sessionCreatedSchema.safeParse(response.body).success).toBe(true);
    verifiedId = response.body.id;
  });

  it("A3 — un score modifié donne verified = false (session enregistrée)", async () => {
    const submission = honestSubmission();
    submission.client.score = 9999;

    const response = await request(server).post("/api/sessions").send(submission).expect(201);

    expect(response.body).toMatchObject({ serverScore: 1235, verified: false });
  });

  it("A4 — un corps invalide donne 400", async () => {
    const response = await request(server)
      .post("/api/sessions")
      .send({ ...honestSubmission(), events: [{ t: 10, event: { type: "MOVED", distance: -1 } }] })
      .expect(400);
    expect(response.body.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "events.0.event.distance" })]),
    );

    await request(server).post("/api/sessions").send({}).expect(400);
  });

  it("A4 bis — un cône inconnu ou un scénario inconnu donnent 400", async () => {
    const unknownCone = honestSubmission([
      { t: 10, event: { type: "CONE_HIT", id: "c9" } },
      ...arrivalEvents,
    ]);
    await request(server).post("/api/sessions").send(unknownCone).expect(400);

    await request(server)
      .post("/api/sessions")
      .send({ ...honestSubmission(), scenarioVersion: 2 })
      .expect(400);
  });

  it("A5 — GET /api/sessions liste les sessions enregistrées", async () => {
    const response = await request(server).get("/api/sessions").expect(200);

    expect(response.body).toHaveLength(2);
    expect(sessionListSchema.safeParse(response.body).success).toBe(true);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: verifiedId,
          score: 1235,
          verified: true,
          status: "finished",
        }),
        expect.objectContaining({ score: 1235, verified: false }),
      ]),
    );
  });

  it("A6 — GET /api/sessions/:id retourne le journal ; identifiant inconnu : 404", async () => {
    const response = await request(server).get(`/api/sessions/${verifiedId}`).expect(200);
    expect(sessionDetailSchema.safeParse(response.body).success).toBe(true);

    expect(response.body).toMatchObject({
      id: verifiedId,
      scenarioId: "chantier-1",
      clientScore: 1235,
      serverScore: 1235,
      verified: true,
      durationMs: 1200,
      events: arrivalEvents,
    });

    await request(server).get("/api/sessions/inexistant").expect(404);
  });
});
