// Lógica da verificação de respostas. Sem rede/banco direto: recebe um "repo" (facilita testar).
export const MAX_TENTATIVAS_POR_MINUTO = 10;

export function normalizar(texto) {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// corpo: JSON enviado pelo navegador. repo: { registrarTentativa, lerAtual, lerResposta, avancar }
// Retorna { status, corpo }.
export async function processar(corpo, ip, repo, enigmas, agora = Date.now()) {
  const n = corpo?.enigma;
  const texto = corpo?.resposta;
  if (!Number.isInteger(n) || n < 1 || typeof texto !== "string" || texto.length > 200) {
    return { status: 400, corpo: { erro: "requisicao_invalida" } };
  }

  const janela = Math.floor(agora / 60000);
  const total = await repo.registrarTentativa(ip, janela);
  if (total > MAX_TENTATIVAS_POR_MINUTO) {
    return { status: 429, corpo: { erro: "muitas_tentativas" } };
  }

  const atual = await repo.lerAtual();
  if (n > atual) return { status: 403, corpo: { erro: "nao_liberado" } };

  const esperada = await repo.lerResposta(n);
  if (esperada === null || esperada === undefined) {
    return { status: 404, corpo: { erro: "sem_resposta" } };
  }
  if (normalizar(texto) !== normalizar(esperada)) {
    return { status: 200, corpo: { correta: false } };
  }

  // Acertou o enigma atual: libera o próximo para todos (só se ele existir).
  if (n === atual && enigmas[n + 1]) await repo.avancar(n);
  return { status: 200, corpo: { correta: true } };
}
