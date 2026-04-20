

## Adições ao Feed: Push de curtidas + Compartilhamento externo

Extensões ao plano do Feed Social ("Alcateia") já aprovado, incorporando as duas funcionalidades extras.

### 1. Push notification de curtida

**Quando dispara**: quando alguém curte um post (exceto se a autora curtir o próprio post).

**Lógica anti-spam (importante)**:
- Agrupar curtidas em **janela de 10 minutos** por post.
- Primeira curtida no período → push imediato: *"Maria curtiu seu post 🦁"*.
- Curtidas subsequentes no mesmo post dentro da janela → silenciosas; ao expirar, se houver +1, enviar resumo: *"Maria e mais 3 curtiram seu post 🦁"*.
- Limite de no máx. 1 push por post a cada 10 min.

**Implementação**:
- Nova Edge Function `notify-like` chamada após `INSERT` em `post_likes` (chamada do client logo após inserir a curtida, com `post_id` e `liker_profile_id`).
- A função:
  1. Busca a autora do post (`posts.profile_id`).
  2. Se autora == curtidora → ignora.
  3. Consulta `notification_log` (reutilizando a tabela existente) com `message_key = 'like:{post_id}'` nos últimos 10 min.
  4. Se não houver registro → envia push via `send-push` e grava no `notification_log`.
  5. Tap na notificação → abre `/feed#post-{id}` (scroll automático até o card).
- `sw.js` atualizado para tratar `data.url` com hash e dar foco/scroll.

**Preferência do usuário**:
- Adicionar toggle no `/perfil` → seção "Notificações" → "Avisar quando curtirem meus posts" (default: ligado). Persiste em nova coluna `profiles.notify_likes` (boolean default true). A função `notify-like` respeita essa flag.

### 2. Compartilhamento externo

**Onde aparece**: ícone de compartilhar (`Share2` do lucide) no `PostCard`, ao lado do coração.

**Comportamento**:
- Em mobile com suporte → usa **Web Share API nativa** (`navigator.share`) com:
  - `title`: "Fábrica de Leoas 🦁"
  - `text`: legenda truncada (80 chars) + " — veja no app"
  - `url`: `https://fabricadeleoas.online/feed?post={id}` (deep link)
- Fallback (desktop ou navegador sem suporte): menu dropdown com opções **WhatsApp** (`https://wa.me/?text=...`), **Copiar link** (clipboard + toast "Link copiado!").

**Deep link `/feed?post={id}`**:
- Ao carregar o Feed com `?post=` na query, fazer scroll automático ao card e destacá-lo brevemente (anel rosa por 2s).
- Se o post não existir mais → toast: "Esse post não está mais disponível".

**Privacidade**: o link é público no sentido de roteamento, mas a página `/feed` exige autenticação. Quem não tem conta cai no `/auth` e, após login, é redirecionado de volta ao post. Deixar isso explícito no botão "Compartilhar" via texto auxiliar não é necessário — comportamento padrão.

**Open Graph (opcional, fase 2)**: por ser SPA, preview rico no WhatsApp exigiria SSR/edge function de meta tags. **Fora do escopo agora** — o link compartilhado abrirá direto no app.

### 3. Mudanças no banco

- `profiles`: adicionar coluna `notify_likes boolean default true`.
- Reutilizar `notification_log` existente (campo `message_key` aceita o padrão `like:{post_id}`).
- Sem novas tabelas.

### 4. Arquivos novos/editados (somando ao plano original do Feed)

**Criar**:
- `supabase/functions/notify-like/index.ts`
- `src/components/feed/ShareButton.tsx`

**Editar (já previstos no plano do Feed + ajustes)**:
- `src/pages/Feed.tsx` — leitura do `?post=` e scroll/destaque.
- `src/components/PostCard.tsx` — botão Share + chamada `notify-like` após curtir.
- `src/pages/Perfil.tsx` — toggle "Avisar quando curtirem meus posts".
- `public/sw.js` — suporte a URL com hash para foco no post.

### Fora do escopo

- Open Graph preview (requer SSR).
- Push de novo post do admin (pode entrar depois).
- Notificação agrupada multi-post ("3 pessoas curtiram seus posts").

