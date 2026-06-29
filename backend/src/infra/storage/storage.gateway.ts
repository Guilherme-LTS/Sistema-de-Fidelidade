import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "../../config/env.js";

export class StorageGateway {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);
  }

  /**
   * Stub de upload de arquivos para o Supabase Storage.
   */
  async uploadFile(bucket: string, path: string, file: Buffer, contentType: string) {
    const { data, error } = await this.client.storage
      .from(bucket)
      .upload(path, file, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw error;
    }
    return data;
  }
}

export const storageGateway = new StorageGateway();
