import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileExists } from "./file-exists";

export async function getEnvContent() {
  try {
    const filePath = path.join(process.cwd(), ".env");
    if (!(await fileExists(filePath))) return "";
    const content = await readFile(filePath, "utf-8");
    return content;
  } catch (err) {
    console.error("Could not read .env file:", err);
    throw err;
  }
}
