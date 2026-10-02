import test from "node:test";
import assert from "node:assert/strict";
import { normalizar, processar } from "../src/verificar.js";

const E = { 1: "/1", 2: "/2", 3: "/3" };

function repoFalso({ atual = 1, respostas = { 1: "abacate", 2: "banana" }, tentativas = 1 } = {}) {
  const estado = { atual, avancos: [] };
  return {
    estado,
    registrarTentativa: async () => tentativas,
    lerAtual: async () => estado.atual,
    lerResposta: async (n) => respostas[n] ?? null,
    avancar: async (n) => { if (estado.atual === n) estado.atual = n + 1; estado.avancos.push(n); },
  };
}

test("normalizar ignora acento, maiúscula e espaços nas pontas", () => {
  assert.equal(normalizar("  AbacÁTE "), "abacate");
});

test("resposta certa do enigma atual libera o próximo para todos", async () => {
  const repo = repoFalso({ atual: 1 });
  const r = await processar({ enigma: 1, resposta: "Abacáte" }, "1.1.1.1", repo, E);
  assert.deepEqual(r, { status: 200, corpo: { correta: true } });
  assert.equal(repo.estado.atual, 2);
});

test("resposta errada não avança", async () => {
  const repo = repoFalso({ atual: 1 });
  const r = await processar({ enigma: 1, resposta: "xyz" }, "ip", repo, E);
  assert.deepEqual(r.corpo, { correta: false });
  assert.equal(repo.estado.atual, 1);
});

test("enigma futuro é recusado (403) e não revela nada", async () => {
  const repo = repoFalso({ atual: 1 });
  const r = await processar({ enigma: 2, resposta: "banana" }, "ip", repo, E);
  assert.equal(r.status, 403);
  assert.equal(repo.estado.atual, 1);
});

test("acertar um enigma antigo não mexe no atual", async () => {
  const repo = repoFalso({ atual: 3, respostas: { 1: "abacate", 2: "banana", 3: "x" } });
  const r = await processar({ enigma: 1, resposta: "abacate" }, "ip", repo, E);
  assert.deepEqual(r.corpo, { correta: true });
  assert.equal(repo.estado.atual, 3);
  assert.deepEqual(repo.estado.avancos, []);
});

test("último enigma existente não avança além do mapa", async () => {
  const repo = repoFalso({ atual: 3, respostas: { 3: "fim" } });
  const r = await processar({ enigma: 3, resposta: "fim" }, "ip", repo, E);
  assert.deepEqual(r.corpo, { correta: true });
  assert.equal(repo.estado.atual, 3);
});

test("limite de tentativas e entradas inválidas", async () => {
  let repo = repoFalso({ tentativas: 11 });
  assert.equal((await processar({ enigma: 1, resposta: "abacate" }, "ip", repo, E)).status, 429);
  assert.equal(repo.estado.atual, 1);
  repo = repoFalso();
  for (const c of [null, {}, { enigma: "1", resposta: "a" }, { enigma: 1, resposta: 5 }, { enigma: 0, resposta: "a" }, { enigma: 1, resposta: "a".repeat(201) }]) {
    assert.equal((await processar(c, "ip", repo, E)).status, 400);
  }
});

test("enigma sem resposta cadastrada retorna 404", async () => {
  const repo = repoFalso({ atual: 3, respostas: {} });
  assert.equal((await processar({ enigma: 3, resposta: "a" }, "ip", repo, E)).status, 404);
});
