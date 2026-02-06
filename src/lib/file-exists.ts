import fs from "fs/promises";

/**
 * Check if a file or directory exists
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
export async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
