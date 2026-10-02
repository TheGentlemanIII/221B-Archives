// A resposta é conferida no servidor (/api/verificar). Nenhuma resposta fica neste arquivo.
document.getElementById("resposta").onclick = async function () {
  const botao = this;
  const campo = document.getElementById("07");
  botao.disabled = true;
  try {
    const r = await fetch("/api/verificar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enigma: 7, resposta: campo.value }),
    });
    const dados = await r.json().catch(() => ({}));
    if (r.ok && dados.correta) {
      // leva ao enigma atual, sem recarregar o site (a música não reinicia)
      if (window.irPara) window.irPara("/enigma");
      else window.location.href = "/enigma";
    } else if (r.ok) {
      alert("Você Errou Tente Novamente");
    } else if (r.status === 429) {
      alert("Muitas tentativas. Aguarde um minuto e tente de novo.");
    } else {
      alert("Não foi possível verificar agora. Tente novamente em instantes.");
    }
  } catch (e) {
    alert("Sem conexão. Tente novamente.");
  } finally {
    botao.disabled = false;
  }
};
