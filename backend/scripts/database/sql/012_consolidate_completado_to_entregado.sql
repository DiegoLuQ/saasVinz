-- Migration: consolidate order statuses to a single final state = 'entregado'.
-- 'completado' (and English 'completed') are retired as states; any existing
-- order in that state is migrated to 'entregado'. Idempotent.

UPDATE oc_cremations
   SET status = 'entregado'
 WHERE status IN ('completado', 'completed');
