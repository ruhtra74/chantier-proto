import { expect, test } from "@playwright/test";
import { pendingSessions, playToEnd } from "./helpers";

test.describe.configure({ mode: "serial" });

test("l'application démarre, affiche le HUD et une partie est vérifiée par le serveur", async ({
  page,
  request,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Un engin sur un chantier" })).toBeVisible();
  await expect(page.getByText("Scénario fourni par le serveur.")).toBeVisible();

  await playToEnd(page);

  await expect(page.getByRole("heading", { name: "Arrivée atteinte !" })).toBeVisible();
  await expect(page.getByText("✓ Score vérifié par le serveur")).toBeVisible();
  const score = await page.locator(".score-value").textContent();
  expect(await pendingSessions(page)).toEqual([]);

  const sessions = await (await request.get("/api/sessions")).json();
  expect(sessions).toHaveLength(1);
  expect(sessions[0]).toMatchObject({ verified: true, reason: "arrivee", score: Number(score) });
  expect(consoleErrors).toEqual([]);
});

test("l'historique liste la partie et le rejeu local donne le score du serveur", async ({
  page,
}) => {
  await page.goto("/historique");
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("✓ oui");

  await rows.first().getByRole("button", { name: "Rejouer" }).click();
  await expect(rows.first()).toContainText("= serveur");
});

test("sans API, la partie se termine et la session est renvoyée plus tard", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.getByText("Scénario fourni par le serveur.")).toBeVisible();

  // Coupure de l'API vue du navigateur (le serveur, lui, reste démarré).
  await page.route("**/api/**", (route) => route.abort("connectionrefused"));
  await playToEnd(page);
  await expect(page.getByText(/Serveur injoignable : partie conservée/)).toBeVisible();
  expect(await pendingSessions(page)).toHaveLength(1);

  // Retour de l'API : la navigation suivante déclenche le renvoi.
  await page.unroute("**/api/**");
  await page.getByRole("link", { name: "Historique" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await expect(page.getByText(/en attente d'envoi/)).toHaveCount(0);
  expect(await pendingSessions(page)).toEqual([]);

  const sessions = await (await request.get("/api/sessions")).json();
  expect(sessions.every((session: { verified: boolean }) => session.verified)).toBe(true);
});

test("une session en attente est renvoyée au chargement suivant de l'application", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page.route("**/api/sessions", (route) =>
    route.request().method() === "POST" ? route.abort("connectionrefused") : route.continue(),
  );
  await playToEnd(page);
  await expect(page.getByText(/Serveur injoignable/)).toBeVisible();
  await page.unroute("**/api/sessions");

  await page.reload();
  await expect.poll(() => pendingSessions(page)).toEqual([]);
  expect(await (await request.get("/api/sessions")).json()).toHaveLength(3);
});

test("une session falsifiée apparaît non vérifiée dans l'historique", async ({ page, request }) => {
  const [first] = await (await request.get("/api/sessions")).json();
  const detail = await (await request.get(`/api/sessions/${first.id}`)).json();
  const response = await request.post("/api/sessions", {
    data: {
      scenarioId: detail.scenarioId,
      scenarioVersion: detail.scenarioVersion,
      events: detail.events,
      client: { status: "finished", reason: detail.reason, score: detail.serverScore + 500 },
      durationMs: detail.durationMs,
    },
  });
  expect(response.status()).toBe(201);
  expect((await response.json()).verified).toBe(false);

  await page.goto("/historique");
  await expect(page.locator("tbody tr").first()).toContainText("⚠ non");
});
