CREATE TABLE IF NOT EXISTS Users (
  starknet_address char(64) NOT NULL,
  bitcoin_address text
);

CREATE TABLE IF NOT EXISTS Inscriptions (
  inscription_id integer NOT NULL PRIMARY KEY,
  owner char(64) NOT NULL,
  sat_number integer NOT NULL,
  minted_block integer NOT NULL
);
CREATE INDEX IF NOT EXISTS Inscriptions_sat_number ON Inscriptions(sat_number);
CREATE INDEX IF NOT EXISTS Inscriptions_minted_block ON Inscriptions(minted_block);

CREATE TABLE IF NOT EXISTS InscriptionRequests (
  request_id integer NOT NULL PRIMARY KEY,
  owner char(64) NOT NULL
);

-- TODO: Merge this with InscriptionRequests?
CREATE TABLE IF NOT EXISTS InscriptionRequestsStatus (
  request_id integer NOT NULL PRIMARY KEY,
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
