# study-hub API

Referência das rotas do backend (Spring Boot). Base path: `http://localhost:8080` (porta padrão do Spring Boot, ajuste se `server.port` for customizado). Todas as rotas abaixo já incluem o prefixo `/api`.

CORS liberado só para as origens em `CORS_ALLOWED_ORIGINS` (`.env`).

## Erros

Qualquer erro (validação, recurso não encontrado, tipo de arquivo errado, erro interno) volta nesse formato, com o `status` HTTP correspondente:

```json
{
  "timestamp": "2026-09-17T12:00:00Z",
  "status": 404,
  "error": "Not Found",
  "message": "Arquivo não encontrado: 7",
  "path": "/api/files/7",
  "fieldErrors": null
}
```

- `400` — corpo inválido (Bean Validation) → `fieldErrors` vem preenchido com `{ "campo": "mensagem" }`, ou tipo de arquivo incompatível com o endpoint (ex: `PUT /api/files/3/blocks` num arquivo `type=cards`).
- `404` — recurso não encontrado (tópico, arquivo, bloco, carta, slide, nó, cor).
- `500` — erro inesperado (stack trace nunca vai pro cliente, só pro log do servidor).

## Enums (valores válidos)

| Campo | Valores |
|---|---|
| `Topic.icon` | `code`, `book`, `star`, `flag`, `target`, `bulb` |
| `File.type` | `doc`, `cards`, `mindmap`, `slides` |
| `DocumentBlock.type` | `h1`, `h2`, `h3`, `paragraph`, `bullet`, `link`, `image`, `file`, `hr` |
| `Slide.layout` | `single`, `two`, `three` (define quantas `columns` o slide tem) |
| `Slide.titleAlignH` / `SlideColumn.align` | `left`, `center`, `right` |
| `Slide.titleAlignV` | `top`, `center`, `bottom` |
| `MindMapNode.shape` | `rectangle`, `circle`, `square`, `diamond` |
| `MindMapNode.borderStyle` | `none`, `solid`, `dashed`, `dotted` |
| `MindMapNode.fontSize` | `small`, `medium`, `large` |

`Color.slug` (paleta fixa, 8 linhas seedadas na migration): `accent`, `amber`, `blue`, `rose`, `violet`, `teal`, `coral`, `slate`.

---

## Colors

Paleta fixa, só leitura. Usada nos seletores de cor de `Topic` e `MindMapNode`.

### `GET /api/colors`
Resposta `200`:
```json
[{ "id": 1, "slug": "accent", "hexadecimal": "#2f6f4f" }]
```

---

## Topics

### `GET /api/topics`
Resposta `200` — lista todos, ordenados por nome:
```json
[{
  "id": 1,
  "name": "Java",
  "color": { "id": 1, "slug": "accent", "hexadecimal": "#2f6f4f" },
  "icon": "code",
  "fileCount": 4
}]
```

### `POST /api/topics`
Corpo:
```json
{ "name": "Java", "colorId": 1, "icon": "code" }
```
- `name`: obrigatório, máx. 100.
- `colorId`: obrigatório, precisa existir em `colors`.
- `icon`: obrigatório, um dos valores do enum acima.

Resposta `201` — mesmo shape do `GET`, `fileCount: 0`.

### `PUT /api/topics/{id}`
Mesmo corpo do `POST`. Resposta `200` com o tópico atualizado.

### `DELETE /api/topics/{id}`
Resposta `204`. **Cascateia**: apaga todos os `files` do tópico e todo o conteúdo deles (blocks/cards/slides/nodes).

---

## Files

Arquivo é o nó polimórfico (`type` decide qual sub-recurso ele tem: blocks, cards, slides ou mindmap/nodes).

### `GET /api/topics/{topicId}/files?type=doc`
`type` é opcional (`doc`/`cards`/`mindmap`/`slides`) — filtra a listagem. Sem ele, retorna todos os tipos.

Resposta `200`, ordenado por `updatedAt` desc:
```json
[{
  "id": 10,
  "topicId": 1,
  "name": "Beginner Basics",
  "description": "Variáveis, tipos de dados...",
  "type": "doc",
  "metadata": { "count": 5 },
  "createdAt": "2026-09-01T10:00:00Z",
  "updatedAt": "2026-09-15T14:30:00Z"
}]
```
`metadata.count` é o número de itens-filho (blocks/cards/slides/nodes) — use pra exibir "5 blocos", "40 cartas" etc. sem precisar buscar o detalhe inteiro.

### `POST /api/topics/{topicId}/files`
Corpo:
```json
{ "name": "Nova apresentação", "type": "slides" }
```
- `name`: obrigatório, máx. 200.
- `type`: obrigatório, um dos 4 valores.

Resposta `201`, mesmo shape do `GET` acima, criado vazio (`metadata.count: 0`, sem description).

### `GET /api/files/{id}`
Retorna o arquivo + o conteúdo do tipo correspondente (os outros 3 campos vêm `null`):
```json
{
  "file": { "id": 10, "topicId": 1, "name": "...", "type": "doc", "metadata": {...}, "createdAt": "...", "updatedAt": "..." },
  "blocks": [ /* só se type = doc */ ],
  "cards": null,
  "slides": null,
  "nodes": null
}
```

### `PUT /api/files/{id}`
Corpo (renomear/editar descrição — não mexe no `type` nem no conteúdo):
```json
{ "name": "Novo nome", "description": "..." }
```
- `name`: obrigatório, máx. 200. `description`: opcional, máx. 2000.

Resposta `200` com o `FileSummaryResponse`.

### `DELETE /api/files/{id}`
Resposta `204`. Cascateia pro conteúdo (blocks/cards/slides+columns/nodes).

---

## Document blocks (`type = doc`)

Todas as rotas abaixo dão `400` se o arquivo não for `type=doc`.

### `GET /api/files/{fileId}/blocks`
Resposta `200`, ordenado por `order`:
```json
[{
  "id": 1, "order": 0, "type": "h1",
  "contentText": "Título", "linkUrl": null,
  "imageFile": null, "documentFile": null, "documentFileName": null
}]
```
Uso de cada campo por `type`:
| `type` | campos usados |
|---|---|
| `h1`/`h2`/`h3`/`paragraph`/`bullet` | `contentText` |
| `link` | `contentText` (label/mask exibido) + `linkUrl` (destino) |
| `image` | `imageFile` (path/URL no storage) |
| `file` | `documentFile` (path/URL) + `documentFileName` (nome original pro download) |
| `hr` | nenhum |

### `POST /api/files/{fileId}/blocks`
Corpo:
```json
{ "type": "paragraph", "afterId": 5 }
```
- `type`: obrigatório, um dos 9 valores.
- `afterId`: opcional — id do bloco após o qual inserir; omitido/null = insere no final.

Cria o bloco **vazio** (sem `contentText` etc.) — o frontend edita e chama `PUT` logo em seguida (autosave). Resposta `201` com o bloco criado.

### `PUT /api/files/{fileId}/blocks/{blockId}`
Corpo — todos os campos opcionais, só os enviados (não-nulos) são atualizados:
```json
{ "contentText": "Novo texto" }
```
Campos possíveis: `contentText`, `linkUrl`, `imageFile`, `documentFile`, `documentFileName`. Resposta `200`.

### `POST /api/files/{fileId}/blocks/{blockId}/move-up`
### `POST /api/files/{fileId}/blocks/{blockId}/move-down`
Troca a posição com o bloco adjacente (equivalente aos botões sobe/desce do mock). Sem corpo. Resposta `200` vazia. Se já for o primeiro/último, não faz nada (idempotente).

### `DELETE /api/files/{fileId}/blocks/{blockId}`
Resposta `204`. Reindexa `order` dos blocos restantes.

---

## Flashcards (`type = cards`)

Rotas dão `400` se o arquivo não for `type=cards`.

### `GET /api/files/{fileId}/cards`
Resposta `200`, ordenado por `order`:
```json
[{ "id": 1, "order": 0, "front": "What is a class?", "back": "A blueprint..." }]
```

### `POST /api/files/{fileId}/cards`
Corpo: `{ "front": "...", "back": "..." }` — ambos obrigatórios. Insere no final. Resposta `201`.

### `PUT /api/files/{fileId}/cards/{cardId}`
Mesmo corpo do `POST` (substitui `front`/`back` por completo). Resposta `200`.

### `DELETE /api/files/{fileId}/cards/{cardId}`
Resposta `204`. Reindexa `order`.

---

## Slides (`type = slides`)

Rotas dão `400` se o arquivo não for `type=slides`.

### `GET /api/files/{fileId}/slides`
Resposta `200`, ordenado por `order`:
```json
[{
  "id": 1, "order": 0, "title": "Slide 1",
  "layout": "single", "titleAlignH": "center", "titleAlignV": "center",
  "bgImage": null,
  "columns": [{ "id": 1, "order": 0, "text": "", "align": "left", "image": null }]
}]
```

### `POST /api/files/{fileId}/slides`
### `PUT /api/files/{fileId}/slides/{slideId}`
Mesmo corpo pros dois — o `PUT` substitui o slide **inteiro**, incluindo `columns` (a lista enviada substitui todas as colunas existentes, sem precisar mandar `id`):
```json
{
  "title": "Slide 1",
  "layout": "two",
  "titleAlignH": "center",
  "titleAlignV": "center",
  "bgImage": null,
  "columns": [
    { "text": "Coluna A", "align": "left", "image": null },
    { "text": "Coluna B", "align": "left", "image": null }
  ]
}
```
- `columns`: obrigatório, 1 a 3 itens (a quantidade deve bater com o `layout`: `single`→1, `two`→2, `three`→3, mas isso **não é validado no backend** — é o frontend que monta a lista certa, igual o mock faz).
- Demais campos: opcionais, com default (`layout: single`, `titleAlignH/V: center`).

`POST` insere no final (`order` = quantidade atual de slides). Resposta `201`/`200`.

### `DELETE /api/files/{fileId}/slides/{slideId}`
Resposta `204`. Cascateia pras `columns` e reindexa `order` dos slides restantes.

---

## MindMap nodes (`type = mindmap`)

Rotas dão `400` se o arquivo não for `type=mindmap`. Árvore simples: cada nó tem no máximo um `parentId` (raiz = `parentId: null`). Não existe conceito de aresta entre nós distantes.

### `GET /api/files/{fileId}/mindmap/nodes`
Resposta `200`, lista **plana** (o frontend reconstrói a árvore via `parentId`):
```json
[{
  "id": 1, "parentId": null, "label": "Java", "description": "",
  "x": 480, "y": 260, "w": 150, "h": 75,
  "shape": "rectangle",
  "color": null,
  "borderStyle": "none",
  "borderColor": null,
  "fontSize": "medium"
}]
```

### `POST /api/files/{fileId}/mindmap/nodes`
Corpo:
```json
{ "parentId": 1, "label": "Novo nó", "x": 400, "y": 220, "w": 140, "h": 70 }
```
- `parentId`: opcional (null = nó raiz); se enviado, precisa ser um nó existente **do mesmo arquivo** (senão `404`).
- `label`, `x`, `y`, `w`, `h`: obrigatórios.
- Demais campos (`shape`, `color`, `borderStyle`, `fontSize`) nascem com o default (`rectangle`/nenhuma cor/`none`/`medium`) — ajuste depois via `PATCH`.

Resposta `201`.

### `PATCH /api/files/{fileId}/mindmap/nodes/{nodeId}`
Corpo — **todos os campos opcionais**, só os enviados (não-nulos) são aplicados:
```json
{ "x": 512, "y": 300 }
```
Campos possíveis: `label`, `description`, `x`, `y`, `w`, `h`, `shape`, `colorId`, `borderStyle`, `borderColorId`, `fontSize`.

> **Limitação conhecida**: não dá pra "limpar" `colorId`/`borderColorId` de volta pro padrão (null) via PATCH — só trocar por outro id. Enviar `null` é interpretado como "não alterar", não como "remover".

Resposta `200`.

### `DELETE /api/files/{fileId}/mindmap/nodes/{nodeId}`
Resposta `204`. **Cascateia**: apaga também todos os descendentes do nó (FK `ON DELETE CASCADE`), sem precisar de lógica extra no frontend.
