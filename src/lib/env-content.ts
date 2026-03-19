import { readFile } from "node:fs/promises";
import { fileExists } from "./file-exists";
import { getConfigPath } from "./env";

export async function getConfigContent() {
  try {
    const filePath = getConfigPath();
    if (!(await fileExists(filePath))) return "";
    const content = await readFile(filePath, "utf-8");
    return content;
  } catch (err) {
    console.error("Could not read config file:", err);
    throw err;
  }
}

export const getEnvContent = getConfigContent;
