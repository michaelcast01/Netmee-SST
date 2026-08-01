import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

function objectPath(key: string) {
  if (!key || key.includes("\\") || key.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("Ruta de almacenamiento inválida.");
  }

  const namespace = process.env.LOCAL_PRIVATE_STORAGE_NAMESPACE?.trim();
  if (namespace && !/^[a-zA-Z0-9_-]+$/.test(namespace)) throw new Error("Espacio de almacenamiento inválido.");
  return join(process.cwd(), ".data", "private-storage", namespace ?? "", ...key.split("/"));
}

export async function putLocalPrivateObject(key: string, body: Uint8Array) {
  const path = objectPath(key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body);
}

export async function getLocalPrivateObject(key: string) {
  try {
    return new Uint8Array(await readFile(objectPath(key)));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}

export async function deleteLocalPrivateObject(key: string) {
  try {
    await unlink(objectPath(key));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return;
    throw error;
  }
}
