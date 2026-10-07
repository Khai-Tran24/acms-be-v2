-- Run once with psql -v ON_ERROR_STOP=1 before starting the updated application.
-- Unknown legacy auction values abort the entire migration; correct them and rerun.
BEGIN;

-- 1. Cap nhat bang contract
ALTER TABLE contract ALTER COLUMN contract_number DROP NOT NULL;
ALTER TABLE contract ADD COLUMN IF NOT EXISTS parent_contract_id integer;

ALTER TABLE contract DROP CONSTRAINT IF EXISTS contract_parent_fk;
ALTER TABLE contract ADD CONSTRAINT contract_parent_fk
  FOREIGN KEY (parent_contract_id) REFERENCES contract(contract_id) ON DELETE RESTRICT;

ALTER TABLE contract DROP CONSTRAINT IF EXISTS contract_parent_not_self;
ALTER TABLE contract ADD CONSTRAINT contract_parent_not_self
  CHECK (parent_contract_id IS NULL OR parent_contract_id <> contract_id);

CREATE INDEX IF NOT EXISTS contract_parent_idx ON contract(parent_contract_id);

-- 2. Tao ENUM types (Safe create)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auction_format_enum') THEN
        CREATE TYPE auction_format_enum AS ENUM (
          'TRUC_TIEP_BANG_LOI_NO', 'BANG_BO_PHIEU_TRUC_TIEP',
          'BANG_BO_PHIEU_GIAN_TIEP', 'TRUC_TUYEN'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auction_method_enum') THEN
        CREATE TYPE auction_method_enum AS ENUM ('TRA_GIA_LEN', 'DAT_GIA_XUONG');
    END IF;
END $$;

-- 3. Cap nhat bang regulation
ALTER TABLE regulation ALTER COLUMN auction_format DROP NOT NULL;
ALTER TABLE regulation ALTER COLUMN auction_method DROP NOT NULL;

UPDATE regulation SET auction_format = (
  CASE replace(lower(trim(auction_format::text)), 'Đ', 'đ')
    WHEN '' THEN NULL
    WHEN 'trực tiếp' THEN 'TRUC_TIEP_BANG_LOI_NO'
    WHEN 'trực tiếp bằng lời nói' THEN 'TRUC_TIEP_BANG_LOI_NO'
    WHEN 'đấu giá trực tiếp bằng lời nói' THEN 'TRUC_TIEP_BANG_LOI_NO'
    WHEN 'bỏ phiếu trực tiếp' THEN 'BANG_BO_PHIEU_TRUC_TIEP'
    WHEN 'đấu giá bằng bỏ phiếu trực tiếp' THEN 'BANG_BO_PHIEU_TRUC_TIEP'
    WHEN 'bỏ phiếu gián tiếp' THEN 'BANG_BO_PHIEU_GIAN_TIEP'
    WHEN 'đấu giá bằng bỏ phiếu gián tiếp' THEN 'BANG_BO_PHIEU_GIAN_TIEP'
    WHEN 'trực tuyến' THEN 'TRUC_TUYEN'
    WHEN 'đấu giá trực tuyến' THEN 'TRUC_TUYEN'
    ELSE trim(auction_format::text) 
  END
)::auction_format_enum;

UPDATE regulation SET auction_method = (
  CASE replace(lower(trim(auction_method::text)), 'Đ', 'đ')
    WHEN '' THEN NULL
    WHEN 'trả giá lên' THEN 'TRA_GIA_LEN'
    WHEN 'đặt giá xuống' THEN 'DAT_GIA_XUONG'
    ELSE trim(auction_method::text) 
  END
)::auction_method_enum;

ALTER TABLE regulation ALTER COLUMN auction_format TYPE auction_format_enum
  USING auction_format::text::auction_format_enum;
ALTER TABLE regulation ALTER COLUMN auction_method TYPE auction_method_enum
  USING auction_method::text::auction_method_enum;

-- 4. Cap nhat bang announcement
ALTER TABLE announcement ALTER COLUMN auction_format DROP NOT NULL;
ALTER TABLE announcement ALTER COLUMN auction_method DROP NOT NULL;

UPDATE announcement SET auction_format = (
  CASE replace(lower(trim(auction_format::text)), 'Đ', 'đ')
    WHEN '' THEN NULL
    WHEN 'trực tiếp' THEN 'TRUC_TIEP_BANG_LOI_NO'
    WHEN 'trực tiếp bằng lời nói' THEN 'TRUC_TIEP_BANG_LOI_NO'
    WHEN 'đấu giá trực tiếp bằng lời nói' THEN 'TRUC_TIEP_BANG_LOI_NO'
    WHEN 'bỏ phiếu trực tiếp' THEN 'BANG_BO_PHIEU_TRUC_TIEP'
    WHEN 'đấu giá bằng bỏ phiếu trực tiếp' THEN 'BANG_BO_PHIEU_TRUC_TIEP'
    WHEN 'bỏ phiếu gián tiếp' THEN 'BANG_BO_PHIEU_GIAN_TIEP'
    WHEN 'đấu giá bằng bỏ phiếu gián tiếp' THEN 'BANG_BO_PHIEU_GIAN_TIEP'
    WHEN 'trực tuyến' THEN 'TRUC_TUYEN'
    WHEN 'đấu giá trực tuyến' THEN 'TRUC_TUYEN'
    ELSE trim(auction_format::text) 
  END
)::auction_format_enum;

UPDATE announcement SET auction_method = (
  CASE replace(lower(trim(auction_method::text)), 'Đ', 'đ')
    WHEN '' THEN NULL
    WHEN 'trả giá lên' THEN 'TRA_GIA_LEN'
    WHEN 'đặt giá xuống' THEN 'DAT_GIA_XUONG'
    ELSE trim(auction_method::text) 
  END
)::auction_method_enum;

ALTER TABLE announcement ALTER COLUMN auction_format TYPE auction_format_enum
  USING auction_format::text::auction_format_enum;
ALTER TABLE announcement ALTER COLUMN auction_method TYPE auction_method_enum
  USING auction_method::text::auction_method_enum;

COMMIT;