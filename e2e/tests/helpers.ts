import { expect, type Page } from "@playwright/test";

/** Lance une partie depuis l'accueil et roule tout droit jusqu'à l'écran de fin. */
export async function playToEnd(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Démarrer la partie" }).click();
  await expect(page).toHaveURL(/\/jeu$/);
  // Le HUD est affiché dès le lancement ; la scène est jouable après le chargement Havok + GLB.
  const hud = page.locator("app-hud .hud");
  await expect(hud).toBeVisible();
  await expect(hud).toContainText("Carburant 100");
  await expect(hud).toContainText("Distance 0,0 m");
  await page.waitForFunction(
    () => performance.getEntriesByName("chantier:scene-prete").length > 0,
    undefined,
    { timeout: 30_000 },
  );

  await page.keyboard.down("ArrowUp");
  await expect(page).toHaveURL(/\/fin$/, { timeout: 40_000 });
  await page.keyboard.up("ArrowUp");
}

export const PENDING_KEY = "chantier.sessions-en-attente";

export function pendingSessions(page: Page): Promise<unknown[]> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "[]") as unknown[],
    PENDING_KEY,
  );
}
