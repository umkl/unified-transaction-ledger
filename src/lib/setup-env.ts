import fs from "fs";

export async function setupEnv() {
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
