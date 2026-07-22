import type { Metadata } from "next";

import { EvidenceAnalysis } from "@/components/evidence/evidence-analysis";
import { requirePermission } from "@/lib/auth/dal";
import { getPrisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Validaciones de IA" };

export default async function AiValidationsPage() {
  await requirePermission("inspection.review");
  const analyses = await getPrisma().aiAnalysis.findMany({
    where: { needsReview: true, status: { in: ["DETECTED", "NOT_DETECTED", "LOW_CONFIDENCE"] } },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      evidence: {
        select: {
          id: true,
          fileName: true,
          inspection: { select: { id: true, code: true, activity: { select: { name: true } }, worker: { select: { name: true } } } },
        },
      },
    },
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <p className="text-sm font-semibold text-[var(--brand)]">CONTROL HUMANO</p>
      <h1 className="mt-2 text-3xl font-semibold">Validaciones de IA</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Confirma o descarta cada resultado. Los EPP faltantes confirmados generan automáticamente una acción correctiva.</p>
      <section className="mt-7 grid gap-4 lg:grid-cols-2">
        {analyses.map((analysis) => (
          <article className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm" key={analysis.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <a className="font-mono text-xs font-semibold text-[var(--brand)]" href={`/inspecciones/${analysis.evidence.inspection.id}`}>{analysis.evidence.inspection.code}</a>
                <h2 className="mt-1 font-semibold">{analysis.evidence.inspection.activity.name}</h2>
                <p className="mt-1 text-xs text-[var(--muted)]">{analysis.evidence.inspection.worker.name} · {analysis.evidence.fileName}</p>
              </div>
              <a className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold" href={`/api/v1/evidence/${analysis.evidence.id}`} target="_blank">Ver foto</a>
            </div>
            <EvidenceAnalysis
              canValidate
              evidenceId={analysis.evidence.id}
              initialAnalysis={{
                id: analysis.id,
                status: analysis.status,
                confidence: analysis.confidence === null ? null : Number(analysis.confidence),
                result: analysis.result,
                modelVersion: analysis.modelVersion,
                createdAt: analysis.createdAt.toISOString(),
                needsReview: analysis.needsReview,
              }}
            />
          </article>
        ))}
        {!analyses.length ? <div className="rounded-2xl border border-dashed border-[var(--line)] p-12 text-center text-sm text-[var(--muted)] lg:col-span-2">No hay análisis pendientes de validación.</div> : null}
      </section>
    </main>
  );
}
