-- Cria política para permitir que usuários autenticados façam upload para o bucket tenant-logos
DROP POLICY IF EXISTS "Permitir upload para tenant-logos" ON storage.objects;

CREATE POLICY "Permitir upload para tenant-logos" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'tenant-logos'
);

-- Opcional: Permitir que o usuário atualize o próprio arquivo
DROP POLICY IF EXISTS "Permitir update em tenant-logos" ON storage.objects;

CREATE POLICY "Permitir update em tenant-logos" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'tenant-logos');
