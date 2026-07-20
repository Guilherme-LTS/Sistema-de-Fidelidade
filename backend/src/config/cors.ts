import { env } from "./env.js";

export const corsConfig = {
  origin: env.ALLOWED_ORIGINS,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-ID"],
};
