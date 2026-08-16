import { expect, test } from "@playwright/test";

test("health e página pública respondem", async ({ page, request }) => {
  const health = await request.get("/api/health");
  await expect(health).toBeOK();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Marcação online")).toBeVisible();
});

test("login inválido não cria sessão", async ({ request }) => {
  const response = await request.post("/api/auth/login", { data: { email: "invalido@example.com", password: "errada" } });
  expect(response.status()).toBe(401);
});

test("administrador entra e abre a agenda", async ({ page }) => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, "Credenciais E2E não configuradas");
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("Palavra-passe").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /Marcações/ })).toBeVisible();
});
