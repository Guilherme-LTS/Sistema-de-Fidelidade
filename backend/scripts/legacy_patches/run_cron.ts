import dotenv from 'dotenv';
dotenv.config();

// MOCK the HTTP req/res for fastify
const mockRequest = {
  headers: { authorization: `Bearer ${process.env.CRON_SECRET || 'secret'}` },
  log: {
    info: console.log,
    error: console.error,
  }
} as any;

const mockReply = {
  status: (code: number) => ({
    send: (body: any) => {
      console.log(`Response ${code}:`, body);
    }
  })
} as any;

// Use process.env.CRON_SECRET internally, let's set it if missing
process.env.CRON_SECRET = process.env.CRON_SECRET || 'secret';

import { cronController } from './src/modules/cron/cron.controller.js';

async function run() {
  console.log("Starting cron job...");
  await cronController.processExpirations(mockRequest, mockReply);
  console.log("Cron job finished.");
  process.exit(0);
}

run();
