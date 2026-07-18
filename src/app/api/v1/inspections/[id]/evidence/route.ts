import { createHash, randomUUID } from "node:crypto";

import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";
import { deleteEvidenceObject, putEvidenceObject } from "@/lib/storage/s3";
import { detectSupportedImage, MAX_EVIDENCE_BYTES } from "@/modules/evidence/file-validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });
  const { id: inspectionId } = await params;
  const inspection = await getPrisma().inspection.findUnique({ where: { id: inspectionId }, select: { workerId: true, status: true } });
  if (!inspection) return Response.json({ error: "Inspección no encontrada" }, { status: 404 });
  if (inspection.workerId !== user.id && !hasPermission(user.permissions, "inspection.review")) return Response.json({ error: "Sin permiso" }, { status: 403 });
  if (["APPROVED", "REJECTED", "CANCELLED"].includes(inspection.status)) return Response.json({ error: "La inspección ya está cerrada" }, { status: 409 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Archivo requerido" }, { status: 400 });
  if (file.size === 0 || file.size > MAX_EVIDENCE_BYTES) return Response.json({ error: "La imagen debe pesar entre 1 byte y 10 MB" }, { status: 413 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const image = detectSupportedImage(bytes);
  if (!image) return Response.json({ error: "Solo se permiten imágenes JPEG, PNG o WebP válidas" }, { status: 415 });
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const storagePath = `evidence/${inspectionId}/${randomUUID()}.${image.extension}`;
  await putEvidenceObject(storagePath, bytes, image.mimeType, checksum);

  try {
    const evidence = await getPrisma().$transaction(async (tx) => {
      const created = await tx.evidence.create({ data: { inspectionId, storagePath, fileName: file.name.slice(0, 255), mimeType: image.mimeType, fileSize: file.size, checksum, uploadedById: user.id, retentionUntil: new Date(Date.now() + 5 * 365 * 86400000) } });
      await tx.auditLog.create({ data: { actorId: user.id, action: "evidence.uploaded", entityType: "evidence", entityId: created.id, metadata: { inspectionId, checksum } } });
      return created;
    });
    return Response.json({ data: { id: evidence.id, fileName: evidence.fileName } }, { status: 201 });
  } catch (error) {
    await deleteEvidenceObject(storagePath).catch(() => undefined);
    throw error;
  }
}
