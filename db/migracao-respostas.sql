-- Rode no Console do D1 (uma vez). Não contém nenhuma resposta.
CREATE TABLE IF NOT EXISTS respostas (
  enigma   INTEGER PRIMARY KEY,
  resposta TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tentativas (
  chave   TEXT PRIMARY KEY,
  janela  INTEGER NOT NULL,
  total   INTEGER NOT NULL
);
