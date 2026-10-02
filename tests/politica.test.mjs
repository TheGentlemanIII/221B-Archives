import test from "node:test";
import assert from "node:assert/strict";
import { ENIGMAS } from "../src/enigmas.js";
import { classificarRota, decidir } from "../src/politica.js";
import { lerEnigmaAtual } from "../src/banco.js";
import { onRequest } from "../functions/_middleware.js";

const E = { 1: "/1/a.html", 2: "/2/b.html", 3: "/3/c.html", 4: "/4/d.html" };
const r = (p) => classificarRota(p);

test("classificação de rotas", () => {
  assert.deepEqual(r("/"), { tipo: "livre" });
  assert.deepEqual(r("/index.html"), { tipo: "livre" });
  assert.deepEqual(r("/enigma"), { tipo: "raiz" });
  assert.deepEqual(r("/enigma3"), { tipo: "atalho", n: 3 });
  assert.deepEqual(r("/3/WIEDL.js"), { tipo: "pasta", n: 3 });
  assert.deepEqual(r("/css/style.css"), { tipo: "livre" });
});

test("atual = 3", () => {
  assert.equal(decidir(r("/3/x.html"), 3, E).acao, "passar");
  assert.deepEqual(decidir(r("/1/x.html"), 3, E), { acao: "redirecionar", destino: "/3/c.html" });
  assert.deepEqual(decidir(r("/enigma2"), 3, E), { acao: "redirecionar", destino: "/3/c.html" });
  assert.deepEqual(decidir(r("/enigma3"), 3, E), { acao: "redirecionar", destino: "/3/c.html" });
  assert.equal(decidir(r("/4/x.html"), 3, E).acao, "nao_liberado");
  assert.equal(decidir(r("/4/x.js"), 3, E).acao, "nao_liberado");
  assert.equal(decidir(r("/enigma4"), 3, E).acao, "nao_liberado");
  assert.equal(decidir(r("/enigma99"), 3, E).acao, "nao_encontrado");
  assert.equal(decidir(r("/"), 3, E).acao, "passar");
  assert.deepEqual(decidir(r("/enigma"), 3, E), { acao: "redirecionar", destino: "/3/c.html" });
  assert.equal(decidir(r("/css/style.css"), 3, E).acao, "passar");
});

test("atual sem página cadastrada não libera nada", () => {
  assert.equal(decidir(r("/1/x.html"), 50, E).acao, "nao_encontrado");
});

const bancoFalso = (valor, erro) => ({
  prepare: () => ({ first: async () => { if (erro) throw erro; return valor; } }),
});

test("lerEnigmaAtual valida o valor", async () => {
  assert.equal(await lerEnigmaAtual(bancoFalso(3)), 3);
  await assert.rejects(lerEnigmaAtual(bancoFalso(null)));
  await assert.rejects(lerEnigmaAtual(bancoFalso(0)));
  await assert.rejects(lerEnigmaAtual(undefined));
});

const chamar = (path, db) =>
  onRequest({
    request: new Request("https://site.test" + path),
    env: { DB: db },
    next: async () => new Response("CONTEUDO", { status: 200 }),
  });

test("middleware: fluxo completo com enigma_atual = 3 (páginas reais)", async () => {
  const db = bancoFalso(3);
  let res = await chamar("/3/WIEDL.html", db);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  assert.equal(await res.text(), "CONTEUDO");

  res = await chamar("/enigma1", db);
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("Location"), ENIGMAS[3]);

  res = await chamar("/2/Xlrhz_Uluz.js", db);
  assert.equal(res.status, 302);

  res = await chamar("/4/VmVyZGUgbMOpc2JpY2E=.js", db);
  assert.equal(res.status, 404);
  assert.notEqual(await res.text(), "CONTEUDO");

  res = await chamar("/css/style.css", db);
  assert.equal(await res.text(), "CONTEUDO");
});

test("middleware: falha do banco bloqueia (503) e não vaza conteúdo", async () => {
  const res = await chamar("/3/WIEDL.html", bancoFalso(null, new Error("down")));
  assert.equal(res.status, 503);
  assert.notEqual(await res.text(), "CONTEUDO");
  const semBinding = await chamar("/5/x.html", undefined);
  assert.equal(semBinding.status, 503);
});
