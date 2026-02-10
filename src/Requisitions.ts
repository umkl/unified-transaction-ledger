import fs from "fs/promises";
import http from "node:http";
import { createRequisition } from "./requests/requisition";
import { log } from "./utils";
import { confirm } from "@inquirer/prompts";
import open from "open";

export class Requisitions {
  private requisitions = new Map<string, any>();
  private constructor(requisitions: Map<string, any>) {
    this.requisitions = requisitions;
  }

  public static async create() {
    const filePath = process.cwd() + "/cache/requisitions.json";
    try {
      const rawRequisitions = await fs.readFile(filePath, {
        encoding: "utf-8",
      });
      const jsonRequisitions = JSON.parse(rawRequisitions);
      return new Requisitions(new Map(Object.entries(jsonRequisitions)));
    } catch (e) {
      await fs.mkdir(process.cwd() + "/cache", { recursive: true });
      await fs.writeFile(filePath, "", {
        encoding: "utf-8",
      });
      return new Requisitions(new Map());
    }
  }

  async getRequisitionId(insti: string) {
    if (this.requisitions.has(insti)) {
      console.log(`Requisition for institution ${insti} found in cache.`);

      const fetchNew = await confirm({
        message: `Do you want to fetch a new requisition for institution ${insti}?`,
        default: false,
      });
      if (!fetchNew) {
        return this.requisitions.get(insti)["id"];
      }
    }

    console.log(`Creating new requisition for institution: ${insti}`);

    const requisitionForInstitution: any = await createRequisition(
      process.env["GCL_ACCESS_TOKEN"],
      insti,
    );

    open(requisitionForInstitution["link"] as string);

    let reqId = await new Promise<string>((resolve) => {
      const server = http.createServer((req: any, res: any) => {
        if (req.url?.startsWith("/callback")) {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(
            "<h1>Authorization successful! You can close this window.</h1>",
          );
          const url = new URL(req.url, `http://${req.headers.host}`);
          log(JSON.stringify(Object.fromEntries(url.searchParams)));
          server.close();
          resolve(url.searchParams.get("req_id") || "");
        }
      });
      server.listen(3000, () => {
        log("Waiting for callback on http://localhost:3000/callback...");
      });
    });

    log(`Successfully verified ${insti} with requisition: ${reqId}`);
    this.setRequisition(insti, requisitionForInstitution);
    this.persist();
    return reqId;
  }

  setRequisition(institutionId: any, requisiton: any) {
    this.requisitions.set(institutionId, requisiton);
  }

  async persist() {
    const serialized = JSON.stringify(
      Object.fromEntries(this.requisitions),
      null,
      2,
    );
    const filePath = process.cwd() + "/cache/requisitions.json";
    await fs.writeFile(filePath, serialized);
    log(`Requisitions persisted to ${filePath}`);
  }
}
