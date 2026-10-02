/* Som do site: música ambiente contínua + "tique" nos botões + botão para ligar/desligar.
   Também faz a troca de páginas SEM recarregar o site, para a música nunca reiniciar. */
(function () {
  "use strict";

  // ===== CONFIGURAÇÃO =====
  // Para usar sua própria música: coloque o arquivo em public/audio/ e escreva o caminho aqui.
  // Exemplo: var ARQUIVO_MUSICA = "/audio/ambiente.mp3";
  // Vazio = usa um som ambiente gerado pelo próprio navegador (não precisa de arquivo).
  var ARQUIVO_MUSICA = "";
  var VOLUME_MUSICA = 0.25;   // 0 a 1
  var VOLUME_CLIQUE = 0.15;   // 0 a 1
  // ========================

  var CHAVE = "som-ligado";
  var SELETOR_SOM = 'script[src$="som.js"]';

  // <script src="/js/som.js" data-musica="nao"> = a página só tem o som dos botões, sem música.
  function lerPermissao(doc) {
    var t = doc.querySelector(SELETOR_SOM);
    return !(t && t.getAttribute("data-musica") === "nao");
  }
  var musicaPermitida = lerPermissao(document);

  var ligado = true; // preferência do usuário
  try { ligado = localStorage.getItem(CHAVE) !== "0"; } catch (e) {}

  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, mestre = null, audioEl = null, botao = null;
  var droneCriado = false, iniciado = false, pausadoPorMidia = false;

  /* ---------- Áudio ---------- */

  function garantirContexto() {
    if (!AC) return false;
    if (!ctx) {
      ctx = new AC();
      mestre = ctx.createGain();
      mestre.gain.value = 0;
      mestre.connect(ctx.destination);
    }
    return true;
  }

  // Som ambiente gerado: acorde grave e lento, com leve oscilação.
  function criarDrone() {
    droneCriado = true;
    var filtro = ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = 700;
    filtro.connect(mestre);
    [110, 164.81, 220, 261.63].forEach(function (freq, i) {
      var osc = ctx.createOscillator();
      osc.type = i % 2 ? "sine" : "triangle";
      osc.frequency.value = freq;
      osc.detune.value = (i - 1.5) * 4;
      var ganho = ctx.createGain();
      ganho.gain.value = 0.12;
      var lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.03;
      var lfoGanho = ctx.createGain();
      lfoGanho.gain.value = 0.06;
      lfo.connect(lfoGanho);
      lfoGanho.connect(ganho.gain);
      osc.connect(ganho);
      ganho.connect(filtro);
      osc.start();
      lfo.start();
    });
  }

  function aplicarVolume() {
    var alvo = (ligado && !pausadoPorMidia && musicaPermitida) ? VOLUME_MUSICA : 0;
    if (ARQUIVO_MUSICA) {
      if (!audioEl) return;
      audioEl.volume = alvo;
      if (alvo === 0) audioEl.pause();
      else if (audioEl.paused && iniciado) audioEl.play().catch(function () {});
    } else if (ctx && mestre) {
      mestre.gain.setTargetAtTime(alvo, ctx.currentTime, 0.5);
    }
  }

  function iniciar() {
    if (iniciado || !ligado) return;
    if (ARQUIVO_MUSICA) {
      if (!audioEl) {
        audioEl = new Audio(ARQUIVO_MUSICA);
        audioEl.loop = true;
        audioEl.volume = 0;
        try {
          var pos = parseFloat(sessionStorage.getItem("som-pos"));
          if (pos > 0) audioEl.currentTime = pos;
        } catch (e) {}
      }
      var p = audioEl.play();
      if (p && p.then) {
        p.then(function () { iniciado = true; aplicarVolume(); removerGestos(); atualizarBotao(); })
          .catch(function () {});
      }
    } else if (garantirContexto()) {
      ctx.resume().then(function () {
        if (ctx.state !== "running") return;
        if (!droneCriado) criarDrone();
        iniciado = true;
        aplicarVolume();
        removerGestos();
        atualizarBotao();
      }).catch(function () {});
    }
  }

  // Navegadores só liberam som depois de um toque/clique do usuário.
  var EVENTOS_GESTO = ["pointerdown", "keydown", "touchstart"];
  function aoGesto(e) {
    if (e.target && e.target.closest && e.target.closest("#som-botao")) return; // o botão cuida de si
    iniciar();
  }
  function removerGestos() {
    EVENTOS_GESTO.forEach(function (ev) { document.removeEventListener(ev, aoGesto, true); });
  }
  EVENTOS_GESTO.forEach(function (ev) { document.addEventListener(ev, aoGesto, true); });

  // Barulho curto de botão.
  function tique() {
    if (!ligado || !garantirContexto()) return;
    ctx.resume();
    var t = ctx.currentTime;
    var osc = ctx.createOscillator();
    var ganho = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(660, t);
    osc.frequency.exponentialRampToValueAtTime(330, t + 0.08);
    ganho.gain.setValueAtTime(0.0001, t);
    ganho.gain.exponentialRampToValueAtTime(VOLUME_CLIQUE, t + 0.01);
    ganho.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(ganho);
    ganho.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  document.addEventListener("pointerdown", function (e) {
    var alvo = e.target && e.target.closest ? e.target.closest("button, a, [role=button]") : null;
    if (alvo && alvo.id !== "som-botao") tique();
  }, true);

  // Se a página tocar áudio/vídeo próprio, a música ambiente dá lugar a ele.
  function outraMidiaTocando() {
    var itens = document.querySelectorAll("audio, video");
    for (var i = 0; i < itens.length; i++) {
      if (itens[i] !== audioEl && !itens[i].paused) return true;
    }
    return false;
  }
  ["play", "pause", "ended"].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      if (e.target === audioEl) return;
      pausadoPorMidia = outraMidiaTocando();
      aplicarVolume();
    }, true);
  });

  // Aba escondida = silêncio.
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (ctx && ctx.state === "running") ctx.suspend();
      if (audioEl) audioEl.pause();
    } else if (iniciado && ligado) {
      if (ctx) ctx.resume();
      aplicarVolume();
    }
  });
  window.addEventListener("pagehide", function () {
    try { if (audioEl) sessionStorage.setItem("som-pos", String(audioEl.currentTime)); } catch (e) {}
  });

  /* ---------- Botão 🔊 / 🔇 ---------- */

  function atualizarBotao() {
    if (!botao) return;
    var esperando = ligado && musicaPermitida && !iniciado && !!AC;
    var tocando = ligado && (iniciado || !musicaPermitida);
    botao.textContent = tocando ? "🔊" : "🔇";
    botao.classList.toggle("espera", esperando);
    var texto = !ligado ? "Ligar o som" : (esperando ? "Toque para ativar o som" : "Desligar o som");
    botao.title = texto;
    botao.setAttribute("aria-label", texto);
  }

  function alternar() {
    ligado = !ligado;
    try { localStorage.setItem(CHAVE, ligado ? "1" : "0"); } catch (e) {}
    if (ligado) {
      if (!iniciado) iniciar(); else aplicarVolume();
      tique();
    } else {
      aplicarVolume();
    }
    atualizarBotao();
  }

  function aoClicarBotao() {
    // O som estava "ligado" mas esperando o primeiro toque: este clique já o ativa.
    if (ligado && musicaPermitida && !iniciado) { iniciar(); tique(); atualizarBotao(); return; }
    alternar();
  }

  function criarBotao() {
    var estilo = document.createElement("style");
    estilo.id = "som-estilo";
    estilo.textContent =
      "#som-botao{position:fixed;top:calc(10px + env(safe-area-inset-top,0px));right:10px;z-index:900;" +
      "display:block;width:40px;height:40px;margin:0;padding:0;background:rgba(21,21,21,.85);color:#fff;" +
      "border:1px solid #444;border-radius:50%;font-size:18px;line-height:1;cursor:pointer}" +
      "#som-botao:hover{background:#7b2cbf;color:#fff}" +
      "#som-botao.espera{animation:som-pulso 1.6s ease-in-out infinite}" +
      "@keyframes som-pulso{0%,100%{box-shadow:0 0 0 0 rgba(123,44,191,.7)}50%{box-shadow:0 0 0 8px rgba(123,44,191,0)}}";
    document.head.appendChild(estilo);
    botao = document.createElement("button");
    botao.id = "som-botao";
    botao.type = "button";
    botao.addEventListener("click", aoClicarBotao);
    atualizarBotao();
    document.body.appendChild(botao);
  }

  /* ---------- Troca de página sem recarregar (a música não reinicia) ---------- */

  var navegando = false;
  var caminhoAtual = location.pathname + location.search;

  function deveInterceptar(a, e) {
    if (!a || !a.getAttribute("href")) return false;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    if (a.hasAttribute("download")) return false;
    var alvo = a.getAttribute("target");
    if (alvo && alvo !== "_self") return false;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return false;
    if (url.pathname + url.search === location.pathname + location.search && url.hash) return false; // âncora
    var nome = url.pathname.split("/").pop();
    if (/\.[a-z0-9]+$/i.test(nome) && !/\.html?$/i.test(nome)) return false; // arquivos (txt, mp3, imagens...)
    return true;
  }

  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a") : null;
    if (deveInterceptar(a, e)) {
      e.preventDefault();
      irPara(a.href);
    }
  });

  function chaveEstilo(el) {
    return el.tagName === "LINK"
      ? "L:" + new URL(el.getAttribute("href"), location.href).href
      : "S:" + el.textContent;
  }

  function trocarEstilos(novo) {
    var seletor = 'link[rel="stylesheet"], style';
    var atuais = {}, desejados = {};
    Array.prototype.forEach.call(document.head.querySelectorAll(seletor), function (el) {
      if (el.id !== "som-estilo") atuais[chaveEstilo(el)] = el;
    });
    Array.prototype.forEach.call(novo.head.querySelectorAll(seletor), function (el) {
      var k = chaveEstilo(el);
      desejados[k] = true;
      if (!atuais[k]) document.head.appendChild(document.importNode(el, true));
    });
    Object.keys(atuais).forEach(function (k) { if (!desejados[k]) atuais[k].parentNode.removeChild(atuais[k]); });
  }

  // Scripts inseridos por cópia não rodam sozinhos: recria cada um para executar.
  function executarScript(antigo) {
    return new Promise(function (resolve) {
      var s = document.createElement("script");
      Array.prototype.forEach.call(antigo.attributes, function (a) { s.setAttribute(a.name, a.value); });
      var externo = antigo.hasAttribute("src");
      if (externo) s.onload = s.onerror = function () { resolve(); };
      else s.text = antigo.text;
      if (antigo.parentNode) antigo.parentNode.replaceChild(s, antigo);
      else document.body.appendChild(s);
      if (!externo) resolve();
    });
  }

  async function trocarPagina(novo) {
    document.title = novo.title;
    musicaPermitida = lerPermissao(novo);
    trocarEstilos(novo);

    Array.prototype.slice.call(document.body.childNodes).forEach(function (n) {
      if (n !== botao) document.body.removeChild(n);
    });
    Array.prototype.slice.call(novo.body.childNodes).forEach(function (n) {
      document.body.insertBefore(document.importNode(n, true), botao);
    });

    // scripts do <head> da nova página (exceto este) e depois os do <body>
    var pendentes = [];
    Array.prototype.forEach.call(novo.head.querySelectorAll("script"), function (s) {
      if (!s.matches(SELETOR_SOM)) {
        var c = document.importNode(s, true);
        document.head.appendChild(c);
        pendentes.push(c);
      }
    });
    Array.prototype.forEach.call(document.body.querySelectorAll("script"), function (s) { pendentes.push(s); });
    for (var i = 0; i < pendentes.length; i++) await executarScript(pendentes[i]);

    window.scrollTo(0, 0);
    pausadoPorMidia = outraMidiaTocando();
    aplicarVolume();
    atualizarBotao();
    caminhoAtual = location.pathname + location.search;
  }

  async function irPara(destino, historicoJaMudou) {
    if (navegando) return;
    navegando = true;
    try {
      var resp = await fetch(destino, { credentials: "same-origin", cache: "no-store" });
      if ((resp.headers.get("Content-Type") || "").indexOf("text/html") === -1) throw new Error("nao_e_pagina");
      var novo = new DOMParser().parseFromString(await resp.text(), "text/html");
      var urlFinal = resp.url || destino;
      if (historicoJaMudou || urlFinal === location.href) history.replaceState({}, "", urlFinal);
      else history.pushState({}, "", urlFinal);
      await trocarPagina(novo);
    } catch (erro) {
      navegando = false;
      window.location.href = destino; // plano B: navegação normal
      return;
    }
    navegando = false;
  }
  window.irPara = irPara; // as páginas usam: window.irPara("/enigma")

  window.addEventListener("popstate", function () {
    if (location.pathname + location.search !== caminhoAtual) irPara(location.href, true);
  });

  /* ---------- Início ---------- */

  function aoCarregar() {
    criarBotao();
    iniciar(); // tenta começar sozinho; se o navegador bloquear, começa no primeiro toque
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", aoCarregar);
  else aoCarregar();
})();
