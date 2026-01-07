-- =============================================
-- MIGRAÇÃO DE FKs: TICKETS E ASSETS PARA profiles.id
-- =============================================
-- Nota: Esta migration apenas adiciona as FKs. 
-- Os dados existentes já estão alinhados ou serão migrados via script separado.

-- Desabilitar temporariamente os triggers de RLS para permitir ALTER TABLE
SET session_replication_role = replica;

-- =============================================
-- FASE 1: TICKETS
-- =============================================

-- 1. FK para tickets.owner_user_id -> profiles(id)
ALTER TABLE tickets
DROP CONSTRAINT IF EXISTS tickets_owner_user_id_fkey;

ALTER TABLE tickets
ADD CONSTRAINT tickets_owner_profile_fkey
FOREIGN KEY (owner_user_id) REFERENCES profiles(id) ON DELETE SET NULL
NOT VALID;

-- 2. FK para tickets.created_by_user_id -> profiles(id)
ALTER TABLE tickets
DROP CONSTRAINT IF EXISTS tickets_created_by_user_id_fkey;

ALTER TABLE tickets
ADD CONSTRAINT tickets_created_by_profile_fkey
FOREIGN KEY (created_by_user_id) REFERENCES profiles(id) ON DELETE SET NULL
NOT VALID;

-- 3. FK para ticket_messages.author_user_id -> profiles(id)
ALTER TABLE ticket_messages
DROP CONSTRAINT IF EXISTS ticket_messages_author_user_id_fkey;

ALTER TABLE ticket_messages
ADD CONSTRAINT ticket_messages_author_profile_fkey
FOREIGN KEY (author_user_id) REFERENCES profiles(id) ON DELETE SET NULL
NOT VALID;

-- 4. FK para ticket_participants.user_id -> profiles(id)
ALTER TABLE ticket_participants
DROP CONSTRAINT IF EXISTS ticket_participants_user_id_fkey;

ALTER TABLE ticket_participants
ADD CONSTRAINT ticket_participants_profile_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
NOT VALID;

-- =============================================
-- FASE 2: ASSETS
-- =============================================

-- 5. FK para asset_inventory.current_user_id -> profiles(id)
ALTER TABLE asset_inventory
DROP CONSTRAINT IF EXISTS asset_inventory_current_user_id_fkey;

ALTER TABLE asset_inventory
ADD CONSTRAINT asset_inventory_current_user_profile_fkey
FOREIGN KEY (current_user_id) REFERENCES profiles(id) ON DELETE SET NULL
NOT VALID;

-- 6. FKs para asset_movements
ALTER TABLE asset_movements
DROP CONSTRAINT IF EXISTS asset_movements_from_user_id_fkey,
DROP CONSTRAINT IF EXISTS asset_movements_to_user_id_fkey,
DROP CONSTRAINT IF EXISTS asset_movements_performed_by_user_id_fkey,
DROP CONSTRAINT IF EXISTS asset_movements_authorized_by_user_id_fkey;

ALTER TABLE asset_movements
ADD CONSTRAINT asset_movements_from_user_profile_fkey
FOREIGN KEY (from_user_id) REFERENCES profiles(id) ON DELETE SET NULL
NOT VALID;

ALTER TABLE asset_movements
ADD CONSTRAINT asset_movements_to_user_profile_fkey
FOREIGN KEY (to_user_id) REFERENCES profiles(id) ON DELETE SET NULL
NOT VALID;

ALTER TABLE asset_movements
ADD CONSTRAINT asset_movements_performed_by_profile_fkey
FOREIGN KEY (performed_by_user_id) REFERENCES profiles(id) ON DELETE SET NULL
NOT VALID;

ALTER TABLE asset_movements
ADD CONSTRAINT asset_movements_authorized_by_profile_fkey
FOREIGN KEY (authorized_by_user_id) REFERENCES profiles(id) ON DELETE SET NULL
NOT VALID;

-- Reabilitar triggers
SET session_replication_role = DEFAULT;

-- =============================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =============================================
COMMENT ON CONSTRAINT tickets_owner_profile_fkey ON tickets IS 
'Owner do ticket - armazena profiles.id (migrado de auth.users.id em Jan/2026)';

COMMENT ON CONSTRAINT tickets_created_by_profile_fkey ON tickets IS 
'Criador do ticket - armazena profiles.id (migrado de auth.users.id em Jan/2026)';

COMMENT ON CONSTRAINT ticket_messages_author_profile_fkey ON ticket_messages IS 
'Autor da mensagem - armazena profiles.id (migrado de auth.users.id em Jan/2026)';

COMMENT ON CONSTRAINT ticket_participants_profile_fkey ON ticket_participants IS 
'Participante do ticket - armazena profiles.id (migrado de auth.users.id em Jan/2026)';