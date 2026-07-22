import { processAnalysisJob } from "@/modules/ai-alerts/job-processor";

export const dynamic = "force-dynamic";

async function processRequest(request: Request) {
  const secret = process.env.AI_WORKER_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "No autorizado" }, { status: 401 });
  try {
    return Response.json({ data: await processAnalysisJob() });
  } catch {
    return Response.json({ error: "Falló el análisis", data: { processed: true } }, { status: 502 });
  }
}

export const GET = processRequest;
export const POST = processRequest;
