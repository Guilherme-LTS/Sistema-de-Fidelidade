import { createClient, SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";
import { env } from "../../config/env.js";

export class SupabaseAuthGateway {
  private client: SupabaseClient;

  constructor() {
    // Usamos a SERVICE_ROLE_KEY para operações administrativas seguras de autenticação no backend
    this.client = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        transport: ws as any,
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
   * Realiza login e retorna a sessão do usuário.
   */
  async signIn(email: string, password: string) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw error;
    }
    return data;
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

  /**
   * Dispara o e-mail nativo de recuperação de senha do Supabase.
   */
  async resetPasswordForEmail(email: string, redirectTo: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) {
      throw error;
    }
  }
}

export const supabaseAuthGateway = new SupabaseAuthGateway();
