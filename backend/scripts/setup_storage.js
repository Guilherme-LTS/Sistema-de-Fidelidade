const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao encontrados no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
  console.log('Iniciando setup do Storage...');
  
  // 1. Criar o bucket se não existir
  const bucketName = 'tenant-logos';
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('Erro ao listar buckets:', listError);
    return;
  }
  
  const bucketExists = buckets.find(b => b.name === bucketName);
  
  if (!bucketExists) {
    console.log(`Criando bucket '${bucketName}'...`);
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true, // Importante para que a URL gerada seja acessível livremente
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
      fileSizeLimit: 2097152 // 2MB
    });
    
    if (error) {
      console.error('Erro ao criar bucket:', error);
      return;
    }
    console.log(`Bucket '${bucketName}' criado com sucesso.`);
  } else {
    console.log(`Bucket '${bucketName}' já existe. Garantindo que seja público...`);
    // O SDK atual permite atualizar o bucket para garantir que ele é publico
    await supabase.storage.updateBucket(bucketName, {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
      fileSizeLimit: 2097152
    });
  }

  console.log('Setup do Storage concluído!');
}

setupStorage();
