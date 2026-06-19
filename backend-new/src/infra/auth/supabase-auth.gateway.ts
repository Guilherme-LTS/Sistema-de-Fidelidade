import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "../../config/env.js";

export class SupabaseAuthGateway {
  private client: SupabaseClient;

  constructor() {
    // Usamos a SERVICE_ROLE_KEY para operações administrativas seguras de autenticação no backend
    this.client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  /**
   * Obtém o usuário do Supabase a partir do JWT Token.
   */
  async getUser(token: string) {
    const { data: { user }, error } = await this.client.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    return user;
  }
}

export const supabaseAuthGateway = new SupabaseAuthGateway();
