CREATE TABLE IF NOT EXISTS Users (
  starknet_address char(64) NOT NULL,
  bitcoin_address text
);

CREATE TABLE IF NOT EXISTS Inscriptions (
  inscription_id integer NOT NULL,
  tx_hash char(64) NOT NULL,
  tx_index integer NOT NULL,
  owner char(64) NOT NULL,
  sat_number integer NOT NULL,
  minted_block integer NOT NULL,
  minted timestamp NOT NULL
);
CREATE INDEX IF NOT EXISTS Inscriptions_inscription_id ON Inscriptions(inscription_id);
CREATE INDEX IF NOT EXISTS Inscriptions_tx_hash ON Inscriptions(tx_hash);
CREATE INDEX IF NOT EXISTS Inscriptions_tx_index ON Inscriptions(tx_index);
CREATE INDEX IF NOT EXISTS Inscriptions_owner ON Inscriptions(owner);
CREATE INDEX IF NOT EXISTS Inscriptions_sat_number ON Inscriptions(sat_number);
CREATE INDEX IF NOT EXISTS Inscriptions_minted_block ON Inscriptions(minted_block);
CREATE INDEX IF NOT EXISTS Inscriptions_minted ON Inscriptions(minted);

CREATE TABLE IF NOT EXISTS InscriptionRequests (
  inscription_id integer NOT NULL PRIMARY KEY,
  requester char(64) NOT NULL,
  bitcoin_address text NOT NULL,
  fee_token text NOT NULL,
  fee_amount float NOT NULL,
  bytes integer NOT NULL
);
CREATE INDEX IF NOT EXISTS InscriptionRequests_requester ON InscriptionRequests(requester);
CREATE INDEX IF NOT EXISTS InscriptionRequests_inscription_id ON InscriptionRequests(inscription_id);
CREATE INDEX IF NOT EXISTS InscriptionRequests_bitcoin_address ON InscriptionRequests(bitcoin_address);
CREATE INDEX IF NOT EXISTS InscriptionRequests_fee_token ON InscriptionRequests(fee_token);
CREATE INDEX IF NOT EXISTS InscriptionRequests_fee_amount ON InscriptionRequests(fee_amount);
CREATE INDEX IF NOT EXISTS InscriptionRequests_bytes ON InscriptionRequests(bytes);

CREATE TABLE IF NOT EXISTS InscriptionRequestsData (
  inscription_id integer NOT NULL PRIMARY KEY,
  type text NOT NULL,
  inscription_data text NOT NULL
);
CREATE INDEX IF NOT EXISTS InscriptionRequestsData_type ON InscriptionRequestsData(type);

CREATE TABLE IF NOT EXISTS InscriptionRequestsStatus (
  inscription_id integer NOT NULL PRIMARY KEY,
  status integer NOT NULL
);
CREATE INDEX IF NOT EXISTS InscriptionRequestsStatus_status ON InscriptionRequestsStatus(status);

CREATE TABLE IF NOT EXISTS InscriptionLikes (
  key int PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  inscription_id integer NOT NULL,
  liker char(64) NOT NULL,
  UNIQUE(inscription_id, liker)
);
CREATE INDEX IF NOT EXISTS InscriptionLikes_inscription_id ON InscriptionLikes(inscription_id);
CREATE INDEX IF NOT EXISTS InscriptionLikes_liker ON InscriptionLikes(liker);

CREATE TABLE IF NOT EXISTS InscriptionSaves (
  key int PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  inscription_id integer NOT NULL,
  saver char(64) NOT NULL,
  UNIQUE(inscription_id, saver)
);
CREATE INDEX IF NOT EXISTS InscriptionSaves_inscription_id ON InscriptionSaves(inscription_id);
CREATE INDEX IF NOT EXISTS InscriptionSaves_saver ON InscriptionSaves(saver);
