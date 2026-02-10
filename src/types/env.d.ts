declare namespace NodeJS {
  interface ProcessEnv {
    GCL_SECRET_ID: string;
    GCL_SECRET_KEY: string;
    GCL_ACCESS_TOKEN: string;
    GCL_REFRESH_TOKEN: string;
    REQUISITION_ID: string;
    TR_PHONE: string;
    TR_PIN: string;
    TR_JWT: string;
  }

  interface Process {
    env: ProcessEnv;
  }
}
