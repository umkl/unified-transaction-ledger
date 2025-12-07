declare namespace NodeJS {
  interface ProcessEnv {
    SECRET_ID: string;
    SECRET_KEY: string;
    ACCESS: string;
    REFRESH: string;
    REQUISITION_ID: string;
  }

  interface Process {
    env: ProcessEnv;
  }
}

declare module "date-prompt";

// declare module "node:readline/promises" {}
