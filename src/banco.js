// Lê enigma_atual do banco D1 (binding chamado DB). Lança erro se algo estiver errado.
export async function lerEnigmaAtual(db) {
  if (!db) throw new Error("Binding DB (D1) não configurado");
  const valor = await db
    .prepare("SELECT enigma_atual FROM configuracao WHERE id = 1")
    .first("enigma_atual");
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1) throw new Error("enigma_atual inválido: " + valor);
  return n;
}

// Acesso ao banco usado pela verificação de respostas.
export function criarRepo(db) {
  if (!db) throw new Error("Binding DB (D1) não configurado");
  return {
    lerAtual: () => lerEnigmaAtual(db),
    lerResposta: (n) =>
      db.prepare("SELECT resposta FROM respostas WHERE enigma = ?1").bind(n).first("resposta"),
    // Só avança se o atual ainda for n (evita avançar duas vezes se dois jogadores acertarem juntos).
    avancar: (n) =>
      db
        .prepare(
          "UPDATE configuracao SET enigma_atual = ?1, atualizado_em = datetime('now') WHERE id = 1 AND enigma_atual = ?2"
        )
        .bind(n + 1, n)
        .run(),
    registrarTentativa: async (chave, janela) => {
      const r = await db
        .prepare(
          `INSERT INTO tentativas (chave, janela, total) VALUES (?1, ?2, 1)
           ON CONFLICT(chave) DO UPDATE SET
             total = CASE WHEN janela = ?2 THEN total + 1 ELSE 1 END,
             janela = ?2
           RETURNING total`
        )
        .bind(chave, janela)
        .all();
      return Number(r.results[0].total);
    },
  };
}
