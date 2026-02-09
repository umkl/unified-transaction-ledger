import fs from "fs";
import { log } from "../utils";

export async function loadEnv() {
  const doesEnvExist = await new Promise<boolean>((resolve) => {
    fs.access(process.cwd() + "/.env", fs.constants.F_OK, (err) => {
      resolve(!err);
    });
  });

  if (doesEnvExist) {
    const envFile = await new Promise<string>((resolve, reject) => {
      fs.readFile(
        process.cwd() + "/.env",
        { encoding: "utf-8" },
        (err, data: string) => {
          if (err) reject(err);
          resolve(data);
        },
      );
    });

    for (const line of envFile.split("\n")) {
      const [key, value] = line.split("=");
      process.env[key] = value;
    }
  }
}
export async function persistEnv(keysToPersist: string[] = []) {
  const envContent = keysToPersist
    .map((key) => {
      const value = process.env[key] || "";
      const assignment = `${key}=${value}`;
      log(assignment);
      return assignment;
    })
    .join("\n");

  return new Promise<void>((resolve, reject) => {
    fs.writeFile(
      process.cwd() + "/.env",
      envContent,
      { encoding: "utf-8" },
      (err) => {
        if (err) reject(err);
        resolve();
      },
    );
  });
}
