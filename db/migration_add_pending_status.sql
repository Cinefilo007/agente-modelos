-- Migración: Agregar 'pending' al CHECK constraint de models.status
-- Fecha: 2026-04-08
-- Razón: El estado 'pending' se usaba en el código pero no estaba permitido
--         por el constraint, causando que /solicitudes siempre reportara vacío.

ALTER TABLE models DROP CONSTRAINT IF EXISTS models_status_check;
ALTER TABLE models ADD CONSTRAINT models_status_check
  CHECK (status IN ('prospect', 'pending', 'verifying', 'active', 'rejected', 'paused'));
