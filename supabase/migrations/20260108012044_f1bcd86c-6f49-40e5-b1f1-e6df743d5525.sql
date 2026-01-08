
-- Disable the BU scope trigger and RLS
ALTER TABLE asset_categories DISABLE TRIGGER trg_enforce_bu_scope_asset_categories;
ALTER TABLE asset_categories DISABLE ROW LEVEL SECURITY;

-- Delete all existing categories
DELETE FROM asset_categories WHERE bu_id = 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f';

-- Insert parent categories
INSERT INTO asset_categories (bu_id, name, parent_id) VALUES
('f3d2d8a5-2143-42f0-8738-9b51fb74b49f', 'Informática', NULL),
('f3d2d8a5-2143-42f0-8738-9b51fb74b49f', 'Periféricos', NULL),
('f3d2d8a5-2143-42f0-8738-9b51fb74b49f', 'Monitores & Telas', NULL),
('f3d2d8a5-2143-42f0-8738-9b51fb74b49f', 'Rede & Infra TI', NULL),
('f3d2d8a5-2143-42f0-8738-9b51fb74b49f', 'Audiovisual', NULL),
('f3d2d8a5-2143-42f0-8738-9b51fb74b49f', 'Iluminação & Estúdio', NULL),
('f3d2d8a5-2143-42f0-8738-9b51fb74b49f', 'Cabos & Energia', NULL),
('f3d2d8a5-2143-42f0-8738-9b51fb74b49f', 'Mobiliário', NULL),
('f3d2d8a5-2143-42f0-8738-9b51fb74b49f', 'Infraestrutura', NULL),
('f3d2d8a5-2143-42f0-8738-9b51fb74b49f', 'Copa', NULL);

-- Insert subcategories for Informática
INSERT INTO asset_categories (bu_id, name, parent_id)
SELECT 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f', name, (SELECT id FROM asset_categories WHERE name = 'Informática' AND bu_id = 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f' AND parent_id IS NULL)
FROM (VALUES ('Notebook'), ('Computador desktop (CPU)'), ('Dock station'), ('Carregador de notebook'), ('Tablet corporativo')) AS t(name);

-- Insert subcategories for Periféricos
INSERT INTO asset_categories (bu_id, name, parent_id)
SELECT 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f', name, (SELECT id FROM asset_categories WHERE name = 'Periféricos' AND bu_id = 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f' AND parent_id IS NULL)
FROM (VALUES ('Mouse'), ('Teclado'), ('Headset'), ('Fone de ouvido'), ('Webcam'), ('Mousepad ergonômico'), ('Hub USB / Adaptador USB-C')) AS t(name);

-- Insert subcategories for Monitores & Telas
INSERT INTO asset_categories (bu_id, name, parent_id)
SELECT 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f', name, (SELECT id FROM asset_categories WHERE name = 'Monitores & Telas' AND bu_id = 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f' AND parent_id IS NULL)
FROM (VALUES ('Monitor'), ('TV'), ('Projetor (Datashow)'), ('Controle remoto (TV/Projetor)')) AS t(name);

-- Insert subcategories for Rede & Infra TI
INSERT INTO asset_categories (bu_id, name, parent_id)
SELECT 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f', name, (SELECT id FROM asset_categories WHERE name = 'Rede & Infra TI' AND bu_id = 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f' AND parent_id IS NULL)
FROM (VALUES ('Roteador'), ('Switch de rede'), ('Access point (Wi-Fi)'), ('Nobreak (UPS)'), ('Estabilizador'), ('Impressora')) AS t(name);

-- Insert subcategories for Audiovisual
INSERT INTO asset_categories (bu_id, name, parent_id)
SELECT 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f', name, (SELECT id FROM asset_categories WHERE name = 'Audiovisual' AND bu_id = 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f' AND parent_id IS NULL)
FROM (VALUES ('Câmera'), ('Microfone'), ('Caixa de som'), ('Gimbal'), ('Teleprompter')) AS t(name);

-- Insert subcategories for Iluminação & Estúdio
INSERT INTO asset_categories (bu_id, name, parent_id)
SELECT 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f', name, (SELECT id FROM asset_categories WHERE name = 'Iluminação & Estúdio' AND bu_id = 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f' AND parent_id IS NULL)
FROM (VALUES ('Iluminação LED portátil'), ('Softbox'), ('Tripé / Suporte'), ('Refletor de estúdio')) AS t(name);

-- Insert subcategories for Cabos & Energia
INSERT INTO asset_categories (bu_id, name, parent_id)
SELECT 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f', name, (SELECT id FROM asset_categories WHERE name = 'Cabos & Energia' AND bu_id = 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f' AND parent_id IS NULL)
FROM (VALUES ('Cabo HDMI'), ('Cabo de força / extensão'), ('Filtro de linha'), ('Bateria externa (power bank)'), ('Carregador universal')) AS t(name);

-- Insert subcategories for Mobiliário
INSERT INTO asset_categories (bu_id, name, parent_id)
SELECT 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f', name, (SELECT id FROM asset_categories WHERE name = 'Mobiliário' AND bu_id = 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f' AND parent_id IS NULL)
FROM (VALUES ('Cadeira de escritório'), ('Mesa'), ('Armário')) AS t(name);

-- Insert subcategories for Infraestrutura
INSERT INTO asset_categories (bu_id, name, parent_id)
SELECT 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f', name, (SELECT id FROM asset_categories WHERE name = 'Infraestrutura' AND bu_id = 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f' AND parent_id IS NULL)
FROM (VALUES ('Ar-condicionado'), ('Ventilador')) AS t(name);

-- Insert subcategories for Copa
INSERT INTO asset_categories (bu_id, name, parent_id)
SELECT 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f', name, (SELECT id FROM asset_categories WHERE name = 'Copa' AND bu_id = 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f' AND parent_id IS NULL)
FROM (VALUES ('Cafeteira'), ('Micro-ondas')) AS t(name);

-- Re-enable trigger and RLS
ALTER TABLE asset_categories ENABLE TRIGGER trg_enforce_bu_scope_asset_categories;
ALTER TABLE asset_categories ENABLE ROW LEVEL SECURITY;
