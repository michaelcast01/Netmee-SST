import { processAnalysisJob } from "@/modules/ai-alerts/job-processor";
import { requestIdFrom } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

async function processRequest(request: Request) {
  const requestId = requestIdFrom(request);
  const secret = process.env.AI_WORKER_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "No autorizado" }, { status: 401, headers: { "x-request-id": requestId } });
  try {
    return Response.json({ data: await processAnalysisJob(undefined, { requestId }) }, { headers: { "x-request-id": requestId } });
  } catch {
    return Response.json({ error: "Falló el análisis", data: { processed: true } }, { status: 502, headers: { "x-request-id": requestId } });
  }
}

export const GET = processRequest;
export const POST = processRequest;
