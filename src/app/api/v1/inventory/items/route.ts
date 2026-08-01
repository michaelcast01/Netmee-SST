import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";
import { logEvent, requestIdFrom } from "@/lib/observability/logger";
import { deletePrivateObject, PrivateStorageConfigurationError, putPrivateObject } from "@/lib/storage/s3";
import { detectSupportedImage, MAX_EVIDENCE_BYTES } from "@/modules/evidence/file-validation";
import { createPpeItemSchema, parsePpeExpiry } from "@/modules/inventory/item-input";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof z.ZodError) return { message: error.issues[0]?.message ?? "Los datos del elemento no son válidos.", status: 400 };
  if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
    return { message: "Ya existe un elemento con ese número de serie.", status: 409 };
  }
  if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
    return { message: "El tipo de EPP seleccionado no existe.", status: 400 };
  }
  if (error instanceof PrivateStorageConfigurationError) {
    return { message: error.message, status: 503 };
  }
  return { message: "No se pudo registrar el elemento. Intenta nuevamente.", status: 500 };
}

export async function POST(request: Request) {
  const requestId = requestIdFrom(request);
  const actor = await getCurrentUser();
  if (!actor) return Response.json({ error: "No autenticado" }, { status: 401 });
  if (!hasPermission(actor.permissions, "inventory.update")) {
    return Response.json({ error: "Sin permiso para actualizar inventario" }, { status: 403 });
  }

  let storagePath = "";
  try {
    const form = await request.formData();
    const input = createPpeItemSchema.parse({
      ppeTypeId: form.get("ppeTypeId"),
      serialNumber: form.get("serialNumber"),
      size: form.get("size"),
      expiresAt: form.get("expiresAt"),
    });
    const file = form.get("image");
    if (!(file instanceof File)) {
      return Response.json({ error: "La fotografía del elemento es obligatoria." }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_EVIDENCE_BYTES) {
      return Response.json({ error: "La imagen debe pesar entre 1 byte y 10 MB." }, { status: 413 });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const image = detectSupportedImage(bytes);
    if (!image) {
      return Response.json({ error: "Solo se permiten imágenes JPEG, PNG o WebP válidas." }, { status: 415 });
    }

    const itemId = randomUUID();
    const checksum = createHash("sha256").update(bytes).digest("hex");
    storagePath = `inventory/${itemId}/${randomUUID()}.${image.extension}`;
    await putPrivateObject(storagePath, bytes, image.mimeType, checksum);

    const item = await getPrisma().$transaction(async (tx) => {
      await tx.ppeType.findUniqueOrThrow({ where: { id: input.ppeTypeId } });
      const created = await tx.ppeItem.create({
        data: {
          id: itemId,
          ppeTypeId: input.ppeTypeId,
          serialNumber: input.serialNumber ?? null,
          size: input.size ?? null,
          expiresAt: parsePpeExpiry(input.expiresAt),
          qrCode: `EPP-${randomUUID()}`,
          imageStoragePath: storagePath,
          imageFileName: file.name.slice(0, 255),
          imageMimeType: image.mimeType,
          imageFileSize: file.size,
          imageChecksum: checksum,
        },
      });
      await tx.ppeMovement.create({
        data: { ppeItemId: created.id, actorId: actor.id, type: "PURCHASE", notes: "Alta inicial del elemento con fotografía" },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "inventory.item.created",
          entityType: "ppe_item",
          entityId: created.id,
          metadata: { imageChecksum: checksum },
        },
      });
      return created;
    });

    return Response.json({ data: { id: item.id } }, { status: 201 });
  } catch (error) {
    if (storagePath) await deletePrivateObject(storagePath).catch(() => undefined);
    const response = errorResponse(error);
    if (response.status >= 500) {
      logEvent("error", "inventory.item.create_failed", {
        requestId,
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
    }
    return Response.json({ error: response.message, requestId }, { status: response.status });
  }
}
