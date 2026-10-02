const CABECALHOS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
};

function pagina(titulo, texto, status) {
  const html = `<!DOCTYPE html>
<html lang="pt-br"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titulo}</title><link rel="stylesheet" href="/css/style.css"></head>
<body><h1>${titulo}</h1><p>${texto}</p></body></html>`;
  return new Response(html, { status, headers: CABECALHOS });
}

export const naoLiberado = () =>
  pagina("Ainda não liberado", "Este enigma ainda não está disponível. Volte mais tarde.", 404);
export const naoEncontrado = () => pagina("Não encontrado", "Esta página não existe.", 404);
export const indisponivel = () =>
  pagina("Temporariamente indisponível", "Tente novamente em instantes.", 503);
