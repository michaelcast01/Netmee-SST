import { createHash, randomUUID } from "node:crypto";

import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";
import { createPrivateDownloadUrl, deletePrivateObject, getInMemoryPrivateObject, putPrivateObject } from "@/lib/storage/s3";
import { detectSupportedImage, MAX_EVIDENCE_BYTES } from "@/modules/evidence/file-validation";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });
  if (!hasPermission(user.permissions, "inventory.view")) {
    return Response.json({ error: "Sin permiso para consultar inventario" }, { status: 403 });
  }
  const { id } = await params;
  const item = await getPrisma().ppeItem.findUnique({
    where: { id },
    select: { imageStoragePath: true, imageMimeType: true },
  });
  if (!item?.imageStoragePath) return Response.json({ error: "El elemento no tiene fotografía" }, { status: 404 });
  const inMemoryObject = getInMemoryPrivateObject(item.imageStoragePath);
  if (inMemoryObject) {
    return new Response(Buffer.from(inMemoryObject.body), {
      headers: { "content-type": item.imageMimeType ?? inMemoryObject.contentType, "cache-control": "private, no-store" },
    });
  }
  return Response.redirect(await createPrivateDownloadUrl(item.imageStoragePath), 307);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor) return Response.json({ error: "No autenticado" }, { status: 401 });
  if (!hasPermission(actor.permissions, "inventory.update")) {
    return Response.json({ error: "Sin permiso para actualizar inventario" }, { status: 403 });
  }
  const { id } = await params;
  const current = await getPrisma().ppeItem.findUnique({
    where: { id },
    select: { imageStoragePath: true },
  });
  if (!current) return Response.json({ error: "Elemento no encontrado" }, { status: 404 });

  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof File)) return Response.json({ error: "Fotografía requerida" }, { status: 400 });
  if (file.size === 0 || file.size > MAX_EVIDENCE_BYTES) {
    return Response.json({ error: "La imagen debe pesar entre 1 byte y 10 MB." }, { status: 413 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const image = detectSupportedImage(bytes);
  if (!image) return Response.json({ error: "Solo se permiten imágenes JPEG, PNG o WebP válidas." }, { status: 415 });

  const checksum = createHash("sha256").update(bytes).digest("hex");
  const storagePath = `inventory/${id}/${randomUUID()}.${image.extension}`;
  await putPrivateObject(storagePath, bytes, image.mimeType, checksum);
  try {
    await getPrisma().$transaction([
      getPrisma().ppeItem.update({
        where: { id },
        data: {
          imageStoragePath: storagePath,
          imageFileName: file.name.slice(0, 255),
          imageMimeType: image.mimeType,
          imageFileSize: file.size,
          imageChecksum: checksum,
        },
      }),
      getPrisma().auditLog.create({
        data: {
          actorId: actor.id,
          action: current.imageStoragePath ? "inventory.item.image.replaced" : "inventory.item.image.added",
          entityType: "ppe_item",
          entityId: id,
          metadata: { imageChecksum: checksum },
        },
      }),
    ]);
  } catch (error) {
    await deletePrivateObject(storagePath).catch(() => undefined);
    throw error;
  }
  if (current.imageStoragePath) await deletePrivateObject(current.imageStoragePath).catch(() => undefined);
  return Response.json({ data: { id, imageFileName: file.name.slice(0, 255) } });
}
