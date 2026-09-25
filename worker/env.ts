import type { Role } from "../shared/schema";
export type Env = {
  DB: D1Database;
  MEDIA: R2Bucket;
  ENVIRONMENT: string;
  PUBLIC_ORIGIN: string;
  BUSINESS_ID: string;
  RATE_LIMIT_SECRET?: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_SITE_KEY?: string;
};
export type User = {
  id: string;
  business_id: string;
  email: string;
  role: Role;
  csrf: string;
};
export type AppEnv = { Bindings: Env; Variables: { user: User } };
