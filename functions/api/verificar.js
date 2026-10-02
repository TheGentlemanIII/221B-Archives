import { ENIGMAS } from "../../src/enigmas.js";
import { criarRepo } from "../../src/banco.js";
import { processar } from "../../src/verificar.js";

const resposta = (status, corpo) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

// POST /api/verificar  { enigma: 1, resposta: "texto" }
export async function onRequestPost({ request, env }) {
  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return resposta(400, { erro: "requisicao_invalida" });
  }
  try {
    const ip = request.headers.get("CF-Connecting-IP") || "desconhecido";
    const r = await processar(corpo, ip, criarRepo(env.DB), ENIGMAS);
    return resposta(r.status, r.corpo);
  } catch (erro) {
    console.error("Falha em /api/verificar:", erro);
    return resposta(503, { erro: "indisponivel" });
  }
}
