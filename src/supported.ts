import fs from "fs";


export default async function getSupportedInstitutions(countryCode: string): Promise<SupportedInstitution[]> {
  const result = await new Promise<SupportedInstitution[]>((resolve, reject) => {
    fs.readFile(
      `${process.cwd()}/src/const/supported.json`,
      { encoding: "utf-8" },
      (err, result: string) => {
        if (err) reject(err);
        resolve(JSON.parse(result));
      }
    );
  });
  return result.filter((inst) => inst.countries.includes(countryCode));
}
