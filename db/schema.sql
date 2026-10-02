-- Tabela de configuração global do site (1 única linha, id = 1).
-- Para novas configurações no futuro, basta adicionar colunas com ALTER TABLE.
CREATE TABLE IF NOT EXISTS configuracao (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  enigma_atual  INTEGER NOT NULL DEFAULT 1 CHECK (enigma_atual >= 1),
  atualizado_em TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Registro inicial: enigma 1 liberado. (Não duplica se rodar de novo.)
INSERT OR IGNORE INTO configuracao (id, enigma_atual) VALUES (1, 1);
