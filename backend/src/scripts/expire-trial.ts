import { db } from "../infra/database/db.js";
import { tenants } from "../infra/database/schema.js";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

async function expireTrial() {
  const email = process.argv[2];

  if (!email) {
    console.error("❌ Por favor, forneça um email. Exemplo: npm run dev:expire-trial test@test.com");
    process.exit(1);
  }

  console.log(`🔍 Buscando usuário com email: ${email}`);

  // 1. Achar o usuário no Supabase
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError || !usersData?.users) {
    console.error("❌ Erro ao buscar usuários no Supabase:", usersError);
    process.exit(1);
  }

  const user = usersData.users.find(u => u.email === email);
  if (!user) {
    console.error("❌ Usuário não encontrado no Auth.");
    process.exit(1);
  }

  console.log(`✅ Usuário encontrado (ID: ${user.id}). Atualizando Tenant...`);

  // 2. Achar o Tenant e atualizar
  const tenantRows = await db.select().from(tenants).where(eq(tenants.id, user.id));
  
  if (tenantRows.length === 0) {
    console.error("❌ Tenant (Restaurante) não encontrado para este usuário.");
    process.exit(1);
  }

  const tenant = tenantRows[0];

  if (tenant.subscriptionStatus !== "trialing") {
    console.log(`⚠️ Aviso: O status atual da assinatura é '${tenant.subscriptionStatus}', mas vamos forçar a expiração do trial mesmo assim.`);
  }

  // 3. Expirar (Colocar data 1 dia no passado)
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1);

  await db
    .update(tenants)
    .set({
      subscriptionCurrentPeriodEnd: pastDate.toISOString(),
      subscriptionStatus: "trialing", // Garantir que está como trialing
    })
    .where(eq(tenants.id, user.id));

  console.log(`🎉 Sucesso! O Trial do restaurante '${tenant.name}' foi expirado.`);
  console.log(`Data de término atualizada para: ${pastDate.toISOString()}`);
  console.log(`👉 Agora recarregue a página (F5) no frontend para ver o bloqueio.`);
  process.exit(0);
}

expireTrial().catch((err) => {
  console.error("❌ Erro fatal:", err);
  process.exit(1);
});
