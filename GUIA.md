# Como colocar o sistema de enigma_atual no meu site

## 1. Análise do seu projeto (o que encontrei)

| Item | Resultado |
|---|---|
| Linguagem/framework | Nenhum. É um site **100% estático**: HTML + JS + CSS puros |
| Backend/servidor | **Não existe**. Era hospedado no GitHub Pages (há um `CNAME` no histórico do Git) |
| Páginas dos enigmas | Pastas `1/` a `8/` (a `8/8.html` está em branco; a `9/` está vazia) |
| Rotas | Não há rotas. Cada página é um arquivo com nome ofuscado, por exemplo `/1/Udwd d Pdwd.html`. O JS de cada página redireciona para a próxima |
| Banco de dados | Nenhum |
| Pontos de atenção | Veja a seção 10 |

**Consequência importante:** o GitHub Pages **não executa código no servidor**. Sem servidor não dá para consultar um banco com segurança nem bloquear URLs. Por isso o site precisa mudar de hospedagem, mantendo os mesmos arquivos HTML/JS/CSS.

## 2. O que escolhi e por quê

- **Hospedagem:** Cloudflare Pages (grátis). Ela serve seus arquivos como já estão e permite um pequeno código de servidor (Pages Functions) que roda antes de cada página.
- **Banco:** Cloudflare D1 (SQLite gerenciado, grátis). Está na mesma conta, então **não há senha de banco nem string de conexão**. O código acessa o banco por uma ligação interna ("binding") configurada no painel.
- **Conta externa:** só uma conta gratuita na Cloudflare, sem cartão de crédito.
- **Limites do plano grátis** (conferidos na documentação da Cloudflare):
  - Functions: 100.000 requisições por dia, somadas ao total da conta. Arquivos estáticos não contam. Neste projeto, **cada arquivo dentro de `/N/`** (HTML, JS, imagem, txt) conta como 1 requisição, então um acesso a um enigma gasta algumas. Isso comporta em torno de dezenas de milhares de acessos por dia.
  - D1: 5 milhões de linhas lidas por dia, 100 mil escritas por dia, 5 GB. Aqui cada requisição lê 1 linha.
- **Cobrança automática:** no plano grátis não há cobrança. Ao atingir o limite diário, as consultas ao banco passam a falhar até a meia-noite UTC. Só há cobrança se **você** assinar o plano pago (Workers Paid).
- **Atenção (passo manual obrigatório):** por padrão, quando o limite diário de Functions acaba, a Cloudflare **ignora o código de proteção e serve tudo aberto** (modo "fail open"). Você precisa mudar para **"Fail closed"** (passo 6.8). Com isso, em vez de liberar tudo, o site passa a recusar o acesso.

## 3. Comportamento implementado

Com `enigma_atual = 3` no banco:

| Acesso | O que acontece |
|---|---|
| `/` (sua página inicial `index.html`) | **Livre**, abre sempre |
| `/enigma` (botão "Jogar") | Redireciona (302) para a página do enigma atual |
| `/enigma3` | Redireciona para a página do enigma 3 |
| `/enigma1`, `/enigma2` e qualquer arquivo em `/1/…`, `/2/…` | Redireciona para o enigma 3 |
| `/enigma4`, `/4/…` (futuro) | Responde **404 "Ainda não liberado"**, sem entregar o HTML, o JS nem os arquivos. Escolhi bloquear em vez de redirecionar para o jogador entender que ainda precisa esperar |
| `/enigma99` (não existe) | 404 "Não encontrado" |
| `/3/…` (o atual) | Serve a página normalmente |
| Banco fora do ar / não configurado | **503**, e nada é liberado (falha fechada) |

Todas as respostas protegidas levam `Cache-Control: no-store`, para o navegador não guardar uma página antiga depois que você avançar o enigma.

## 4. Arquivos

**Criados:**
- `functions/_middleware.js`: o "porteiro". Roda antes de cada requisição.
- `src/enigmas.js`: lista do número do enigma e o caminho real da página. **É o único arquivo a editar quando criar um novo enigma** (uma linha).
- `src/politica.js`: regras de redirecionar, bloquear ou liberar.
- `src/banco.js`: lê `enigma_atual` do D1.
- `src/paginas.js`: telas de "não liberado", "não encontrado" e "indisponível".
- `db/schema.sql`: cria a tabela e o registro inicial.
- `db/admin.sql`: comandos de administrador.
- `public/_routes.json`: diz à Cloudflare que o porteiro roda em tudo, menos em `/css/*` e `/favicon.png` (economiza o limite diário).
- `tests/politica.test.mjs` e `package.json`: testes automáticos da lógica.
- `GUIA.md`: este guia.

**Movidos (conteúdo idêntico, sem nenhuma alteração):** as pastas `1/` a `8/` e `css/` agora ficam dentro de `public/`. Assim só o conteúdo de `public/` vai para a internet. Os links relativos (`../css/style.css`, `41.txt`, etc.) continuam funcionando.

**Removido:** a pasta `.vscode/`. Ela só tinha uma configuração do seu editor, com o caminho do seu computador, e não deve ser publicada.

**Nenhuma página de enigma foi editada.**

## 5. Banco de dados

1. Crie a conta em https://dash.cloudflare.com/sign-up.
2. No menu: **Storage & Databases → D1 SQL Database → Create database**. Nome: `enigmas-db`.
3. Abra o banco, vá na aba **Console** e cole o conteúdo de `db/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS configuracao (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  enigma_atual  INTEGER NOT NULL DEFAULT 1 CHECK (enigma_atual >= 1),
  atualizado_em TEXT    NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO configuracao (id, enigma_atual) VALUES (1, 1);
```

4. Confira com `SELECT * FROM configuracao;`. Deve aparecer `id = 1`, `enigma_atual = 1`.

A tabela só aceita **uma linha** (`id = 1`) e só aceita números ≥ 1. Para guardar outras configurações no futuro, basta adicionar colunas (`ALTER TABLE configuracao ADD COLUMN ...`).

## 6. Publicação (passo a passo)

**6.1. Organize seu repositório local.** Na pasta do seu projeto atual (a que tem a pasta `.git`):
1. Apague as pastas `1` a `9`, `css` e `.vscode`.
2. Copie para dentro dela **todo o conteúdo** da pasta enviada por mim (`public/`, `functions/`, `src/`, `db/`, `tests/`, `package.json`, `GUIA.md`).
3. Mantenha a pasta `.git`.

**6.2. Envie ao GitHub:**
```
git add -A
git commit -m "Adiciona sistema de enigma_atual (Cloudflare Pages + D1)"
git push
```

**6.3.** Na Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**. Autorize e escolha o repositório `221B-Archives`.

**6.4. Configuração de build:**
- Framework preset: **None**
- Build command: *(deixe vazio)*
- Build output directory: **`public`**

Clique em **Save and Deploy**.

**6.5. Ligue o banco ao site:** projeto → **Settings → Bindings → Add → D1 database**.
- Variable name: **`DB`** (exatamente assim, maiúsculas)
- D1 database: `enigmas-db`
- Salve (faça para **Production**; se quiser testar em Preview, adicione também lá).

**6.6. Faça um novo deploy:** aba **Deployments → Retry deployment** no último. Binding só vale após novo deploy.

**6.7.** Abra o endereço `https://SEU-PROJETO.pages.dev/`. Você deve ser levado ao enigma 1.

**6.8. Muito importante: Fail closed.** Em **Settings → Functions → Fail open/closed**, escolha **Fail closed**.

**6.9. Domínio próprio (opcional):** se você usava um domínio com o GitHub Pages, adicione-o em **Custom domains** do projeto e ajuste o DNS conforme a Cloudflare indicar. Depois, desative o GitHub Pages (Settings → Pages) para não haver uma cópia **desprotegida** do site no ar. Este passo é essencial: **o endereço antigo `*.github.io` continua servindo todos os enigmas sem proteção enquanto estiver ativo.**

## 7. Variáveis de ambiente

**Nenhuma variável secreta é necessária.**
- A ligação com o banco é o *binding* `DB` (passo 6.5). Ele não é uma senha e não aparece em nenhum arquivo.
- Nada de credenciais no código ou no GitHub.
- Se um dia criar uma área administrativa, aí sim haverá um segredo, por exemplo `ADMIN_TOKEN=exemplo-troque-por-algo-longo-e-aleatorio` (valor fictício), cadastrado em **Settings → Variables and Secrets** como *Secret*, nunca no código.

O navegador do jogador **não tem nenhum caminho para alterar `enigma_atual`**: não existe API de escrita. Só quem tem login na sua conta Cloudflare consegue.

## 8. Como eu (administrador) mudo o enigma

**Jeito mais simples e seguro:** painel da Cloudflare → D1 → `enigmas-db` → **Console**:

```sql
UPDATE configuracao SET enigma_atual = 2, atualizado_em = datetime('now') WHERE id = 1;
```

Depois, para o enigma 3, troque `2` por `3`, e assim por diante. Vale para todos os jogadores imediatamente. Não precisa de novo deploy. Para conferir: `SELECT * FROM configuracao;`.

**Para criar um enigma novo (ex.: o 9):** crie a pasta `public/9/` com as páginas, adicione **uma linha** em `src/enigmas.js`, faça `git push` e só então atualize `enigma_atual`.

**Área administrativa:** é possível criar depois uma página com senha que faz esse `UPDATE`. Não criei agora, como você pediu. Recomendo esperar: o console da Cloudflare já é seguro (protegido pelo login da sua conta).

## 9. Procedimento de teste

Use primeiro o endereço `.pages.dev`. (Console do D1 para alterar o valor.)

| # | Ação | Resultado esperado |
|---|---|---|
| 1 | `enigma_atual = 1`. Abra `/` | Vai para o enigma 1 |
| 2 | Abra `/enigma1` | Vai para o enigma 1 |
| 3 | Abra `/enigma2` e `/2/Xlrhz_Uluz.html` | **404 "Ainda não liberado"** |
| 4 | No enigma 1, digite a resposta certa | Vai para o enigma 2, que mostra "Ainda não liberado" (comportamento esperado enquanto o enigma 2 não foi liberado) |
| 5 | No console: `UPDATE ... SET enigma_atual = 2 ...` | — |
| 6 | Recarregue `/` | Vai para o enigma 2 |
| 7 | Abra `/enigma1` e `/1/Udwd d Pdwd.html` | Redireciona para o enigma 2 |
| 8 | Abra `/enigma3` e `/3/WIEDL.js` | 404 "Ainda não liberado" |
| 9 | Altere para 3 e repita os passos 6 a 8, ajustando os números | Enigma 3 liberado; 1 e 2 redirecionam; 4 bloqueado |
| 10 | `/enigma99` | 404 "Não encontrado" |
| 11 | Abra `/css/style.css` | Funciona sempre |

**Teste automático da lógica** (no seu computador, com Node 20+ instalado): `npm test`. Verifiquei esses 6 testes aqui e todos passaram. **Eles testam a lógica com um banco simulado**; o funcionamento real na Cloudflare só pode ser confirmado por você nos passos acima.

## 10. Pontos de atenção do projeto (fora do escopo, mas importantes)

1. **As respostas agora são conferidas no servidor** (veja a seção 13). Antes estavam em texto no JavaScript; os commits antigos do GitHub ainda guardam esse texto, então considere deixar o repositório **privado** (GitHub → Settings → Danger Zone → Change visibility).
2. **Bug no enigma 7:** corrigido na versão da seção 13 (o JS lia o campo errado).
3. O `favicon.png` é referenciado nas páginas, mas o arquivo não existe no projeto.
4. Se o jogador acertar um enigma com o seguinte ainda não liberado, ele vê "Ainda não liberado". Se preferir uma mensagem do tipo "aguarde a próxima liberação" com o mesmo visual do site, é fácil ajustar em `src/paginas.js`.

## 11. O que eu preciso fazer manualmente

- Criar a conta gratuita na Cloudflare.
- Criar o banco `enigmas-db` e rodar o SQL (seção 5).
- Reorganizar o repositório, `git commit` e `git push` (6.1 e 6.2).
- Conectar o repositório ao Cloudflare Pages (6.3 e 6.4).
- Criar o binding `DB` e refazer o deploy (6.5 e 6.6).
- Marcar **Fail closed** (6.8).
- Se tinha domínio próprio: apontá-lo para a Cloudflare e desativar o GitHub Pages (6.9).
- Corrigir o bug do enigma 7, se quiser.

## 12. O que já está configurado

- O código do porteiro (`functions/_middleware.js`) e toda a lógica de redirecionar/bloquear.
- A estrutura do banco (`db/schema.sql`) e o registro inicial.
- A leitura do banco sem nenhuma credencial no código.
- O mapa dos 8 enigmas existentes, com cada caminho conferido contra os arquivos reais.
- A organização em `public/` (sem `.vscode`) e o `_routes.json` para poupar o limite gratuito.
- Cabeçalhos `no-store` e falha fechada quando o banco não responde.
- Os testes automáticos da lógica.

## 13. Acertar a senha libera o próximo enigma para todos (modo automático)

**Como funciona:**
1. O jogador digita a resposta e clica em **Enviar**. A página chama `POST /api/verificar`.
2. O servidor compara com a resposta guardada no banco (tabela `respostas`, que **não** está no GitHub).
3. Se acertou o **enigma atual**, o servidor faz `enigma_atual = enigma_atual + 1` (uma única vez, mesmo que duas pessoas acertem juntas). A partir daí, **todo mundo** que entrar em `/enigma` vai para o novo enigma.
4. O navegador vai para `/enigma`, que leva ao enigma atual.
5. Acertar um enigma **antigo** não muda nada. Responder um enigma **futuro** é recusado.
6. Limite de 10 tentativas por minuto por pessoa (IP), para dificultar adivinhação automática. Mesmo assim, respostas curtas podem ser descobertas por tentativa e erro. Se você tem um domínio próprio, crie também uma regra de *Rate limiting* na Cloudflare.

**Arquivos novos:** `functions/api/verificar.js`, `src/verificar.js`, `db/migracao-respostas.sql`, `tests/verificar.test.mjs`. **Alterados:** `src/banco.js` e os JS dos enigmas 1 a 7 (agora só chamam o servidor).

**Manual:** rodar `db/migracao-respostas.sql` no Console do D1 (cria as tabelas `respostas` e `tentativas`) e depois rodar o arquivo `respostas-PRIVADO.sql` (**nunca** coloque esse arquivo no GitHub). Para trocar uma resposta: `UPDATE respostas SET resposta = 'nova' WHERE enigma = 1;` (use minúsculas e sem acento).

**Voltar atrás:** `UPDATE configuracao SET enigma_atual = 2 WHERE id = 1;` continua funcionando, para qualquer número.

**Atenção:** o enigma 8 é uma página em branco. Quem resolver o enigma 7 faz todo mundo cair nela.

## 14. Som, ícone do celular e chave do desafio 3

**Som (`public/js/som.js`):** música ambiente + barulho curto ao tocar em qualquer botão ou link + botão 🔊/🔇 no canto superior direito (a escolha fica salva no navegador). O navegador só libera som depois do primeiro toque ou clique na página, por isso a música começa nesse momento.
- Por padrão o som ambiente é **gerado pelo navegador** (não precisa de arquivo).
- Para usar uma música sua: coloque o arquivo em `public/audio/` (por exemplo `ambiente.mp3`) e, no início de `som.js`, escreva `var ARQUIVO_MUSICA = "/audio/ambiente.mp3";`. Use só música que você tenha direito de usar.
- A página do enigma 5 (que envolve um áudio) usa `data-musica="nao"`: nela só tocam os barulhos dos botões, para a música não atrapalhar quem está ouvindo o áudio do enigma.
- Para colocar o som em uma nova página, adicione `<script src="/js/som.js" defer></script>` no `<head>`.

**Ícone do celular:** `public/manifest.json`, `public/favicon.png` e `public/icons/` (ícones 192, 512 e `apple-touch-icon`). Os ícones são provisórios: "221B ARCHIVES" em branco e roxo sobre fundo preto. Para usar o seu, substitua os 4 arquivos **mantendo os mesmos nomes e tamanhos** (512×512, 192×192, 180×180 e 64×64, PNG). Ao abrir o site pelo atalho, ele começa na página inicial (`/`).

**Chave do desafio 3:** a palavra "Lara" aparece como texto de fundo da página do enigma 3 (`public/3/WIEDL.html`), fixa na tela, em PC e celular. A cor está em `color: #262626;` dentro do `<style>` dessa página; um número maior (ex.: `#333333`) deixa mais visível.
