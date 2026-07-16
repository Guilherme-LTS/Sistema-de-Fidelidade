import { db } from "../infra/database/db.js";
import { tenants, customers, consumerProfiles, transactions, redemptions, tenantUsers } from "../infra/database/schema.js";
import { eq } from "drizzle-orm";
import { clientesService } from "../modules/clientes/clientes.service.js";

function generateValidCPF(): string {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  
  // Calcular dígito 9
  let sum = digits.reduce((total, digit, index) => total + digit * (10 - index), 0);
  let remainder = (sum * 10) % 11;
  digits.push(remainder === 10 ? 0 : remainder);

  // Calcular dígito 10
  sum = digits.reduce((total, digit, index) => total + digit * (11 - index), 0);
  remainder = (sum * 10) % 11;
  digits.push(remainder === 10 ? 0 : remainder);

  return digits.join("");
}

async function testConcurrency() {
  console.log("=== INICIANDO TESTE DE CONCORRÊNCIA E LIMITES DE CLIENTES ===");
  try {
    const tenant = await db.query.tenants.findFirst();
    if (!tenant) {
      console.error("Nenhum restaurante encontrado no banco.");
      process.exit(1);
    }
    const tenantId = tenant.id;

    // 1. Forçar plano Pro
    console.log("Forçando plano Pro (limite = 500)...");
    await db.update(tenants)
      .set({
        subscriptionPriceId: "price_pro_mensal_dummy",
    }).where(eq(tenants.id, tenantId));

    // 2. Limpar clientes anteriores
    console.log("Limpando transações, resgates e clientes anteriores...");
    await db.delete(transactions);
    await db.delete(redemptions);
    await db.delete(customers).where(eq(customers.tenantId, tenantId));

    // 3. Cadastrar 199 clientes
    console.log("Cadastrando 199 clientes...");
    const batch = [];
    for (let i = 0; i < 199; i++) {
      const doc = generateValidCPF();
      batch.push({
        document: doc,
        name: `Cliente Concorrente ${i + 1}`,
        lgpdConsent: true,
        consentDate: new Date().toISOString(),
      });
    }
    const profiles = await db.insert(consumerProfiles).values(batch).returning();
    await db.insert(customers).values(profiles.map(p => ({
      tenantId,
      consumerProfileId: p.id,
    })));

    // Verificar contagem atual
    let countRes = await db.query.customers.findMany({ where: eq(customers.tenantId, tenantId) });
    console.log(`Clientes cadastrados inicialmente: ${countRes.length}`);

    const adminUser = await db.query.tenantUsers.findFirst({
      where: eq(tenantUsers.role, "admin"),
    });
    const adminId = adminUser?.id || "00000000-0000-0000-0000-000000000000";

    // 4. Lançar 10 requisições simultâneas para cadastrar novos clientes
    console.log("\nEnviando 10 requisições simultâneas para cadastrar novos clientes...");
    const promises = Array.from({ length: 10 }).map(async (_, idx) => {
      const cpf = generateValidCPF();
      try {
        await clientesService.cadastrarCliente(tenantId, adminId, {
          nome: `Cliente Simultaneo ${idx + 1}`,
          document: cpf,
          lgpdConsentimento: true,
        });
        return { idx, status: "SUCCESS" };
      } catch (err: any) {
        return { idx, status: "FAILED", error: err.message };
      }
    });

    const results = await Promise.all(promises);

    const successes = results.filter(r => r.status === "SUCCESS");
    const failures = results.filter(r => r.status === "FAILED");

    console.log(`\nResultados:`);
    console.log(`- Sucessos: ${successes.length}`);
    console.log(`- Falhas: ${failures.length}`);

    failures.slice(0, 3).forEach(f => {
      console.log(`  - Exemplo de falha: ${f.error}`);
    });

    // 5. Verificar total de clientes no banco
    countRes = await db.query.customers.findMany({ where: eq(customers.tenantId, tenantId) });
    console.log(`\nClientes totais no banco após concorrência: ${countRes.length}`);

    if (countRes.length === 200 && successes.length === 1 && failures.length === 9) {
      console.log("\n🏆 TESTE APROVADO! Exatamente 1 requisição passou (atingindo o limite de 200) e as outras 9 foram bloqueadas!");
    } else {
      console.error("\n❌ TESTE FALHOU! O limite de 200 clientes foi excedido ou o comportamento concorrente foi inconsistente.");
    }

  } catch (error) {
    console.error("Erro no teste de concorrência:", error);
  }
  process.exit(0);
}

testConcurrency();
