-- Run after 20261006-contract-family-auction-enums.sql and before restarting the API.
BEGIN;

ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'NHAN_VIEN_BAN_HO_SO';
ALTER TABLE auction_result ADD COLUMN IF NOT EXISTS note text;

CREATE TABLE IF NOT EXISTS auction_registration (
  auction_registration_id serial PRIMARY KEY,
  contract_id integer NOT NULL REFERENCES contract(contract_id) ON DELETE RESTRICT,
  registrant_name varchar(255) NOT NULL,
  identity_number varchar(100) NOT NULL,
  address text NOT NULL,
  registration_fee numeric(18,2) NOT NULL CHECK (registration_fee >= 0),
  registration_fee_status varchar(20) NOT NULL DEFAULT 'CHUA_NOP'
    CHECK (registration_fee_status IN ('CHUA_NOP', 'DA_NOP')),
  registration_fee_paid_date date,
  deposit_amount numeric(18,2) NOT NULL CHECK (deposit_amount >= 0),
  deposit_amount_status varchar(20) NOT NULL DEFAULT 'CHUA_NOP'
    CHECK (deposit_amount_status IN ('CHUA_NOP', 'DA_NOP')),
  deposit_amount_paid_date date,
  note text,
  status varchar(30) NOT NULL DEFAULT 'CHUA_DU_DIEU_KIEN'
    CHECK (status IN ('CHUA_DU_DIEU_KIEN', 'DU_DIEU_KIEN')),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auction_registration_contract ON auction_registration(contract_id);

COMMIT;
