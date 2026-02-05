declare namespace NodeJS {
  interface ProcessEnv {
    SECRET_ID: string;
    SECRET_KEY: string;
    ACCESS: string;
    REFRESH: string;
    REQUISITION_ID: string;
    TR_PHONE: string;
    TR_PIN: string;
    TR_JWT: string;
  }

  interface Process {
    env: ProcessEnv;
  }
}
