import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";
import { createEvidenceDownloadUrl, getInMemoryPrivateObject } from "@/lib/storage/s3";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  const evidence = await getPrisma().evidence.findUnique({ where: { id }, select: { storagePath: true, mimeType: true, retentionDeleteStartedAt: true, inspection: { select: { workerId: true } } } });
  if (!evidence) return Response.json({ error: "Evidencia no encontrada" }, { status: 404 });
  if (evidence.retentionDeleteStartedAt) return Response.json({ error: "La evidencia está en proceso de eliminación por retención" }, { status: 410 });
  if (evidence.inspection.workerId !== user.id && !hasPermission(user.permissions, "inspection.review")) return Response.json({ error: "Sin permiso" }, { status: 403 });
  const inMemoryObject = getInMemoryPrivateObject(evidence.storagePath);
  if (inMemoryObject) {
    return new Response(Buffer.from(inMemoryObject.body), {
      headers: { "content-type": evidence.mimeType, "cache-control": "private, no-store" },
    });
  }
  return Response.redirect(await createEvidenceDownloadUrl(evidence.storagePath), 307);
}
