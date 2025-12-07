import fs from "fs";

export default function getSupportedInstitutions(country: string): any {
  const result = new Promise<string[]>((resolve, reject) => {
    fs.readFile(
      `${process.cwd()}/src/const/supported.json`,
      { encoding: "utf-8" },
      (err, result: string) => {
        if (err) reject(err);
        resolve(JSON.parse(result));
      }
    );
  });
  return result;
}
