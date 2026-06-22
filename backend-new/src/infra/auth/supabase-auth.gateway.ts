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

  get admin() {
    return this.client.auth.admin;
  }

  /**
   * Verifica se a senha atual está correta realizando um login temporário.
   */
  async verifyPassword(email: string, password: string): Promise<boolean> {
    const { error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });
    
    // Como a instância não persiste sessão, não precisamos fazer sign out explicitamente
    return !error;
  }

  /**
   * Atualiza a senha do usuário utilizando privilégios de Admin.
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const { error } = await this.client.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (error) {
      throw error;
    }
  }
}

export const supabaseAuthGateway = new SupabaseAuthGateway();
