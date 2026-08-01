import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { deleteLocalPrivateObject, getLocalPrivateObject, putLocalPrivateObject } from "./local-private-storage";

describe("local private storage", () => {
  let directory = "";
  const previousNamespace = process.env.LOCAL_PRIVATE_STORAGE_NAMESPACE;

  beforeEach(() => {
    const namespace = `test-${randomUUID()}`;
    process.env.LOCAL_PRIVATE_STORAGE_NAMESPACE = namespace;
    directory = join(process.cwd(), ".data", "private-storage", namespace);
  });

  afterEach(async () => {
    if (previousNamespace === undefined) delete process.env.LOCAL_PRIVATE_STORAGE_NAMESPACE;
    else process.env.LOCAL_PRIVATE_STORAGE_NAMESPACE = previousNamespace;
    await rm(directory, { recursive: true, force: true });
  });

  it("guarda, recupera y elimina una imagen privada", async () => {
    const image = Uint8Array.from([0xff, 0xd8, 0xff, 0xdb]);
    const key = "inventory/item-id/photo.jpg";

    await putLocalPrivateObject(key, image);
    expect(await getLocalPrivateObject(key)).toEqual(image);

    await deleteLocalPrivateObject(key);
    expect(await getLocalPrivateObject(key)).toBeNull();
  });

  it("impide salir del directorio privado", async () => {
    await expect(putLocalPrivateObject("../outside.jpg", new Uint8Array())).rejects.toThrow("Ruta de almacenamiento inválida");
  });
});
