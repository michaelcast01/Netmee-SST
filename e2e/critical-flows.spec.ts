import "dotenv/config";
import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { Client } from "pg";

const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
if (!email || !password) throw new Error("Credenciales E2E requeridas.");

const createdInspectionIds: string[] = [];
const createdPpeIds: string[] = [];
let sessionCookies: Parameters<BrowserContext["addCookies"]>[0] = [];

async function databaseClient() {
  const direct = new URL(process.env.DATABASE_URL!);
  const ref = direct.hostname.split(".")[1];
  const db = new Client({
    host: `aws-0-${process.env.SUPABASE_REGION}.pooler.supabase.com`,
    port: 5432,
    user: `postgres.${ref}`,
    password: decodeURIComponent(direct.password),
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();
  return db;
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo corporativo").fill(email!);
  await page.getByLabel("Contraseña").fill(password!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

async function createInspection(page: Page) {
  await page.goto("/inspecciones/nueva");
  await page.getByLabel("Actividad").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Crear inspección" }).click();
  await expect(page).not.toHaveURL(/\/inspecciones\/nueva$/, { timeout: 15_000 });
  await expect(page).toHaveURL(/\/inspecciones\/[\w-]+$/, { timeout: 15_000 });
  const id = page.url().split("/").pop()!;
  createdInspectionIds.push(id);
  return id;
}

async function recordCompliantAiReview(evidenceId: string) {
  const db = await databaseClient();
  const user = await db.query<{ id: string }>("select id from users where email = $1", [email]);
  const analysisId = randomUUID();
  const result = {
    compliant: true,
    personDetected: true,
    imageQuality: "GOOD",
    detectedPpe: [],
    missingPpe: [],
    uncertainPpe: [],
    assessments: [],
    confidence: 0.99,
    summary: "Evidencia conforme preparada por la prueba E2E.",
  };
  await db.query(
    `insert into ai_analysis
      (id, evidence_id, status, provider, model_version, confidence, predicted_compliant, needs_review, result, created_at, updated_at)
     values ($1, $2, 'CONFIRMED', 'e2e', 'e2e-model', 0.99, true, false, $3::jsonb, now(), now())`,
    [analysisId, evidenceId, JSON.stringify(result)],
  );
  await db.query(
    `insert into ai_validations
      (id, analysis_id, validated_by_id, confirmed, decision, notes, created_at)
     values ($1, $2, $3, true, 'CUMPLE', 'Validación E2E', now())`,
    [randomUUID(), analysisId, user.rows[0].id],
  );
  await db.end();
}

async function completeInspection(page: Page) {
  const buttons = page.getByRole("button", { name: "Guardar elemento" });
  const itemCount = await buttons.count();
  expect(itemCount).toBeGreaterThan(0);
  for (let index = 0; index < itemCount; index += 1) {
    const form = buttons.nth(index).locator("xpath=..");
    await form.locator('select[name="compliant"]').selectOption("true");
    const response = page.waitForResponse((candidate) =>
      candidate.request().method() === "POST" && candidate.url().includes("/inspecciones/"));
    await form.getByRole("button", { name: "Guardar elemento" }).click();
    await response;
  }

  await page.route("**/api/v1/evidence/*/analyze", (route) =>
    route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ data: { status: "PENDING" } }),
    }));
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  await page.getByLabel("Captura guiada de cuerpo completo").setInputFiles({
    name: "evidencia.png",
    mimeType: "image/png",
    buffer: png,
  });
  const uploadResponse = page.waitForResponse((candidate) =>
    candidate.request().method() === "POST" && /\/api\/v1\/inspections\/.+\/evidence/.test(candidate.url()));
  await page.getByRole("button", { name: "Cargar y analizar fotografía" }).click();
  const uploadPayload = await (await uploadResponse).json() as { data: { id: string } };
  await expect(page.getByText(/^Evidencia cargada\./)).toBeVisible();
  await recordCompliantAiReview(uploadPayload.data.id);
  await page.reload();
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText("Decisión y firma del responsable SST")).toBeVisible();
}

async function cookieHeader(page: Page) {
  return (await page.context().cookies()).map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

test.beforeAll(async () => {
  const db = await databaseClient();
  const staleInspections = await db.query<{ inspection_id: string }>(
    `select distinct evidence.inspection_id
     from ai_analysis analysis
     join evidence on evidence.id = analysis.evidence_id
     where analysis.provider = 'e2e'`,
  );
  if (staleInspections.rows.length) {
    await db.query("delete from inspections where id = any($1::text[])", [
      staleInspections.rows.map((row) => row.inspection_id),
    ]);
  }
  const stalePpe = await db.query<{ id: string }>(
    "select id from ppe_items where serial_number like 'E2E-%'",
  );
  if (stalePpe.rows.length) {
    const ids = stalePpe.rows.map((row) => row.id);
    await db.query("delete from ppe_movements where ppe_item_id = any($1::text[])", [ids]);
    await db.query("delete from ppe_assignments where ppe_item_id = any($1::text[])", [ids]);
    await db.query("delete from ppe_items where id = any($1::text[])", [ids]);
  }
  await db.end();
});

test.afterAll(async () => {
  if (!createdInspectionIds.length && !createdPpeIds.length) return;
  const db = await databaseClient();
  if (createdInspectionIds.length) {
    await db.query("delete from inspections where id = any($1::text[])", [createdInspectionIds]);
  }
  if (createdPpeIds.length) {
    await db.query("delete from ppe_movements where ppe_item_id = any($1::text[])", [createdPpeIds]);
    await db.query("delete from ppe_assignments where ppe_item_id = any($1::text[])", [createdPpeIds]);
    await db.query("delete from ppe_items where id = any($1::text[])", [createdPpeIds]);
  }
  await db.end();
});

test("login, inspección, evidencia, aprobación, PDF y CSV", async ({ page, request }) => {
  await login(page);
  sessionCookies = await page.context().cookies();
  const id = await createInspection(page);
  await completeInspection(page);
  const approve = page.locator('form:has(input[value="APROBADA"])');
  await approve.getByPlaceholder("Justificación obligatoria").fill("Inspección conforme verificada por prueba E2E");
  await approve.getByRole("button", { name: "Confirmar y firmar" }).click();
  await expect(page.getByText("Firmas y aprobaciones")).toBeVisible();
  const headers = { cookie: await cookieHeader(page) };
  const pdf = await request.get(`/api/v1/inspections/${id}/report.pdf`, { headers });
  expect(pdf.ok()).toBeTruthy();
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  const csv = await request.get("/api/v1/reports/inspections.csv", { headers });
  expect(csv.ok()).toBeTruthy();
  expect(csv.headers()["content-type"]).toContain("text/csv");
});

test("rechazo firmado de una inspección", async ({ page }) => {
  if (sessionCookies.length) {
    await page.context().addCookies(sessionCookies);
    await page.goto("/dashboard");
  } else {
    await login(page);
  }
  await createInspection(page);
  await completeInspection(page);
  const reject = page.locator('form:has(input[value="RECHAZADA"])');
  await reject.getByPlaceholder("Justificación obligatoria").fill("Rechazo controlado para validar la trazabilidad E2E");
  await reject.getByRole("button", { name: "Confirmar y firmar" }).click();
  await expect(page.getByText("Corrección pendiente").first()).toBeVisible();
});

test("registra un EPP con fotografía privada", async ({ page }) => {
  if (sessionCookies.length) await page.context().addCookies(sessionCookies);
  else await login(page);
  await page.goto("/inventario/nuevo");
  await page.getByLabel("Tipo de EPP").selectOption({ index: 1 });
  await page.getByLabel("Número de serie").fill(`E2E-${Date.now()}`);
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  await page.getByLabel("Fotografía del elemento").setInputFiles({
    name: "epp.png",
    mimeType: "image/png",
    buffer: png,
  });
  await page.getByRole("button", { name: "Guardar elemento" }).click();
  await expect(page).toHaveURL(/\/inventario\?created=/, { timeout: 15_000 });
  createdPpeIds.push(new URL(page.url()).searchParams.get("created")!);
  await expect(page.getByText("Elemento y fotografía registrados correctamente.")).toBeVisible();
});
