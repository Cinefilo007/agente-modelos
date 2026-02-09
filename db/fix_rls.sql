-- ⚠️ EJECUTA ESTO EN EL EDITOR SQL DE SUPABASE PARA CORREGIR EL ERROR --

-- Opción 1 (Recomendada para este Bot): Desactivar RLS en la tabla messages
-- Esto permite que el bot (conectado vía service_role o anon) pueda escribir sin restricciones.
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Si también tienes problemas con otras tablas, puedes ejecutar:
ALTER TABLE models DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE model_client_relations DISABLE ROW LEVEL SECURITY;

-- Opción 2 (Si prefieres mantener RLS): Crear política permisiva
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all" ON messages FOR ALL USING (true) WITH CHECK (true);
