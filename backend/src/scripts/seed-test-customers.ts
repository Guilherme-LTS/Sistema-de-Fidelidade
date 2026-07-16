import { db } from "../infra/database/db.js";
import { tenants, customers, consumerProfiles } from "../infra/database/schema.js";

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

async function seedCustomers() {
  console.log("=== INICIANDO SEMENTEIRA DE CLIENTES DE TESTE ===");
  try {
    const tenant = await db.query.tenants.findFirst();
    if (!tenant) {
      console.log("Nenhum restaurante cadastrado no banco. Por favor, crie um antes.");
      process.exit(1);
    }

    const tenantId = tenant.id;
    console.log(`Restaurante selecionado: ${tenant.name} (${tenantId})`);

    const countToSeed = 199;
    console.log(`Cadastrando exatamente ${countToSeed} clientes com CPFs válidos...`);

    const batchSize = 50;
    let seeded = 0;

    while (seeded < countToSeed) {
      const currentBatchSize = Math.min(batchSize, countToSeed - seeded);
      const insertedProfiles = [];

      for (let i = 0; i < currentBatchSize; i++) {
        const index = seeded + i + 1;
        const name = `Cliente Teste ${index}`;
        const doc = generateValidCPF();
        
        insertedProfiles.push({
          document: doc,
          name,
          lgpdConsent: true,
          consentDate: new Date().toISOString()
        });
      }

      // Inserir perfis em lote
      const profilesResult = await db.insert(consumerProfiles).values(insertedProfiles).returning();

      // Inserir relacionamentos de cliente em lote
      const customersToInsert = profilesResult.map(profile => ({
        tenantId,
        consumerProfileId: profile.id
      }));
      await db.insert(customers).values(customersToInsert);

      seeded += currentBatchSize;
      console.log(`- Progresso: ${seeded}/${countToSeed} clientes cadastrados...`);
    }

    console.log("\n✅ SEMENTEIRA CONCLUÍDA COM SUCESSO! 199 CLIENTES DISPONÍVEIS.");
  } catch (error) {
    console.error("❌ Erro durante o seed de clientes:", error);
  }
  process.exit(0);
}

seedCustomers();
