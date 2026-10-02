-- Comandos do administrador (rodar no Console do D1, no painel da Cloudflare).

-- Ver o valor atual:
SELECT * FROM configuracao;

-- Liberar o enigma 2 (troque o número conforme necessário):
UPDATE configuracao
SET enigma_atual = 2, atualizado_em = datetime('now')
WHERE id = 1;
