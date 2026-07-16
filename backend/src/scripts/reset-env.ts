import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' as any });

async function resetEnvironment() {
  console.log('--- INICIANDO RESET DE AMBIENTE ---');
  
  // 1. Deletar todos os usuários do Supabase
  console.log('\n[1] Limpando banco de dados (Supabase)...');
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    console.error('Erro ao listar usuários:', usersError);
  } else {
    const users = usersData.users;
    console.log(`Encontrados ${users.length} usuários para deletar.`);
    for (const user of users) {
      const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
      if (delErr) {
        console.error(`Erro ao deletar usuário ${user.email}:`, delErr);
      } else {
        console.log(`✅ Usuário deletado (Cascata aplicada): ${user.email}`);
      }
    }
  }

  // 2. Deletar todos os Customers do Stripe
  console.log('\n[2] Limpando Portal Financeiro (Stripe)...');
  const customers = await stripe.customers.list({ limit: 100 });
  console.log(`Encontrados ${customers.data.length} Customers para deletar.`);
  
  for (const customer of customers.data) {
    try {
      await stripe.customers.del(customer.id);
      console.log(`✅ Customer deletado na Stripe (Assinaturas e Faturas canceladas): ${customer.email || customer.id}`);
    } catch (err: any) {
      console.error(`Erro ao deletar customer ${customer.id}:`, err.message);
    }
  }

  console.log('\n--- RESET CONCLUÍDO COM SUCESSO ---');
  console.log('O ambiente está 100% limpo e pronto para a criação de uma nova conta de testes.');
}

resetEnvironment().catch(console.error);
