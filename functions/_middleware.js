import { ENIGMAS } from "../src/enigmas.js";
import { classificarRota, decidir } from "../src/politica.js";
import { lerEnigmaAtual } from "../src/banco.js";
import { naoLiberado, naoEncontrado, indisponivel } from "../src/paginas.js";

// Roda antes de qualquer página. O banco (D1) é a fonte oficial de enigma_atual.
export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const rota = classificarRota(url.pathname);
  if (rota.tipo === "livre") return next();

  let atual;
  try {
    atual = await lerEnigmaAtual(env.DB);
  } catch (erro) {
    console.error("Falha ao ler enigma_atual:", erro); // falha = bloqueia (nunca libera)
    return indisponivel();
  }

  const d = decidir(rota, atual, ENIGMAS);
  switch (d.acao) {
    case "redirecionar":
      return new Response(null, {
        status: 302,
        headers: { Location: d.destino, "Cache-Control": "no-store" },
      });
    case "nao_liberado":
      return naoLiberado();
    case "nao_encontrado":
      return naoEncontrado();
    default: {
      const resposta = await next();
      const nova = new Response(resposta.body, resposta);
      nova.headers.set("Cache-Control", "no-store"); // não deixar o navegador guardar
      return nova;
    }
  }
}
