import type { NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";
import { logEvent, requestIdFrom } from "@/lib/observability/logger";
import { inspectionStatusLabels } from "@/modules/inspections";
import { csvCell, parseInspectionCsvFilters } from "@/modules/reports/inspection-csv";

export const dynamic = "force-dynamic";

const CSV_HEADER = ["Código", "Actividad", "Trabajador", "Correo", "Estado", "Elementos", "Evidencias", "Creada", "Finalizada"];
const BATCH_SIZE = 250;

export async function GET(request: NextRequest) {
  const requestId = requestIdFrom(request);
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });
  if (!hasPermission(user.permissions, "report.export")) return Response.json({ error: "Sin permiso" }, { status: 403 });

  const filters = parseInspectionCsvFilters(request.nextUrl.searchParams);
  const encoder = new TextEncoder();
  const db = getPrisma();
  let exported = 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(`\uFEFF${CSV_HEADER.map(csvCell).join(",")}\r\n`));
        let cursor: string | undefined;
        while (exported < filters.limit) {
          const inspections = await db.inspection.findMany({
            where: { ...(filters.status ? { status: filters.status } : {}), ...(filters.createdAt ? { createdAt: filters.createdAt } : {}) },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: Math.min(BATCH_SIZE, filters.limit - exported),
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            include: {
              worker: { select: { name: true, email: true } },
              activity: { select: { name: true } },
              _count: { select: { evidence: true, items: true } },
            },
          });
          if (!inspections.length) break;
          const rows = inspections.map((inspection) => [
            inspection.code,
            inspection.activity.name,
            inspection.worker.name,
            inspection.worker.email,
            inspectionStatusLabels[inspection.status],
            inspection._count.items,
            inspection._count.evidence,
            inspection.createdAt,
            inspection.completedAt,
          ]);
          controller.enqueue(encoder.encode(`${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`));
          exported += inspections.length;
          cursor = inspections.at(-1)?.id;
          if (inspections.length < BATCH_SIZE) break;
        }
        controller.close();
        logEvent("info", "report.inspections.exported", { requestId, exported, limit: filters.limit });
      } catch (error) {
        logEvent("error", "report.inspections.failed", {
          requestId,
          exported,
          error: error instanceof Error ? error.message.slice(0, 500) : "Error desconocido",
        });
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inspecciones-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
      "x-request-id": requestId,
      "x-export-limit": String(filters.limit),
    },
  });
}
