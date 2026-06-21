-- Habilita RLS na tabela de objetos do storage, caso ainda não esteja
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Remove as políticas caso elas já existam para evitar erros
DROP POLICY IF EXISTS "Permitir upload para tenant-logos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir update em tenant-logos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura de logos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir delete de logos" ON storage.objects;

-- Cria a política para upload (INSERT)
CREATE POLICY "Permitir upload para tenant-logos" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'tenant-logos');

-- Cria a política para atualizar (UPDATE)
CREATE POLICY "Permitir update em tenant-logos" 
ON storage.objects FOR UPDATE 
TO authenticated
USING (bucket_id = 'tenant-logos');

-- Cria a política para leitura (SELECT) -> NECESSÁRIO PARA O UPSERT FUNCIONAR
CREATE POLICY "Permitir leitura de logos" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'tenant-logos');

-- Cria a política para deletar (DELETE)
CREATE POLICY "Permitir delete de logos" 
ON storage.objects FOR DELETE 
TO authenticated
USING (bucket_id = 'tenant-logos');
