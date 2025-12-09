import fs from "fs/promises";
import http from "node:http";

import { createRequisition } from "./requests/requisition";
import { log } from "./utils";

// interface for interacting with requisition cache
export class RequisitionsCacheDocument {
  private requisitions = new Map<string, any>();
  private constructor(requisitions: Map<string, any>) {
    this.requisitions = requisitions;
  }

  public static async create() {
    const filePath = process.cwd() + "/cache/requisitions.json";
    const rawTransactions = await fs.readFile(filePath, { encoding: "utf-8" });
    const jsonTransactions = JSON.parse(rawTransactions);
    return new RequisitionsCacheDocument(
      new Map(Object.entries(jsonTransactions))
    );
  }

  async getRequisitionId(insti: string) {
    if (this.requisitions.has(insti)) {
      return this.requisitions.get(insti)["id"];
    }

    // if the requisition doesn't already exist, create a new one

    const requisitionForInstitution: any = await createRequisition(
      process.env.ACCESS,
      insti
    );

    open(requisitionForInstitution["link"] as string);

    let reqId = await new Promise<string>((resolve) => {
      const server = http.createServer((req: any, res: any) => {
        if (req.url?.startsWith("/callback")) {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(
            "<h1>Authorization successful! You can close this window.</h1>"
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
  }

  setRequisition(institutionId: any, requisiton: any) {
    this.requisitions.set(institutionId, requisiton);
  }

  async persist() {
    const serialized = JSON.stringify(
      Object.fromEntries(this.requisitions),
      null,
      2
    );
    const filePath = process.cwd() + "/cache/requisitions.json";
    await fs.writeFile(filePath, serialized);
    log(`Requisitions persisted to ${filePath}`);
  }
}
