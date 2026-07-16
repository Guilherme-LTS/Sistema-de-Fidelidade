import { db } from "../infra/database/db.js";
import { tenants, tenantUsers } from "../infra/database/schema.js";
import { supabaseAuthGateway } from "../infra/auth/supabase-auth.gateway.js";

async function run() {
  console.log("Iniciando geração de 10 operadores para o tenant atual...");
  
  // Pegar o tenant criado mais recentemente (assumindo que o usuário acabou de criar a conta)
  const allTenants = await db.query.tenants.findMany({
    orderBy: (tenants, { desc }) => [desc(tenants.createdAt)],
    limit: 1
  });

  if (allTenants.length === 0) {
    console.error("Nenhum tenant encontrado no banco de dados.");
    process.exit(1);
  }

  const tenant = allTenants[0];
  console.log(`Utilizando tenant: ${tenant.name} (ID: ${tenant.id})`);

  // Criar 10 usuários no Supabase e no banco
  for (let i = 1; i <= 10; i++) {
    const email = `operator${i}_${Date.now()}@teste.com`;
    const name = `Operador de Teste ${i}`;
    const password = "Password123!";

    console.log(`Criando operador ${i}/10: ${email}`);

    try {
      // 1. Criar no Supabase via admin api
      const { data, error } = await supabaseAuthGateway.admin.createUser({
        email,
        password,
        user_metadata: { name },
        email_confirm: true
      });
      
      if (error || !data.user) throw error || new Error("Sem user retornado");
      const authUser = data.user;
      
      // 2. Inserir no tenant_users
      await db.insert(tenantUsers).values({
        tenantId: tenant.id,
        userId: authUser.id,
        role: "operador",
        name,
        isActive: true,
        status: "active",
      });

      console.log(`[OK] Operador ${i} criado com sucesso.`);
    } catch (err: any) {
      console.error(`[ERRO] Falha ao criar operador ${i}:`, err.message);
    }
  }

  console.log("Geração concluída! Verifique sua dashboard.");
  process.exit(0);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
