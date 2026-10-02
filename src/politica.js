// Lógica pura (sem rede/banco): decide o que fazer com cada requisição.

// Identifica a que tipo de rota o caminho pertence.
export function classificarRota(pathname) {
  // "/" (index.html, a página inicial) é livre. "/enigma" é o botão "Jogar": leva ao atual.
  if (/^\/enigma\/?$/.test(pathname)) return { tipo: "raiz" };
  let m = pathname.match(/^\/enigma(\d+)\/?$/);
  if (m) return { tipo: "atalho", n: Number(m[1]) };
  m = pathname.match(/^\/(\d+)(?:\/|$)/);
  if (m) return { tipo: "pasta", n: Number(m[1]) };
  return { tipo: "livre" };
}

// Retorna { acao, destino? } com acao em:
// "passar" | "redirecionar" | "nao_liberado" | "nao_encontrado"
export function decidir(rota, atual, enigmas) {
  if (rota.tipo === "livre") return { acao: "passar", gated: false };

  const paginaAtual = enigmas[atual];
  if (!paginaAtual) return { acao: "nao_encontrado" };

  if (rota.tipo === "raiz") return { acao: "redirecionar", destino: paginaAtual };

  const { n } = rota;
  if (rota.tipo === "atalho" && !enigmas[n]) return { acao: "nao_encontrado" };
  if (n > atual) return { acao: "nao_liberado" };
  if (n < atual) return { acao: "redirecionar", destino: paginaAtual };
  // n === atual
  if (rota.tipo === "atalho") return { acao: "redirecionar", destino: paginaAtual };
  return { acao: "passar", gated: true };
}
