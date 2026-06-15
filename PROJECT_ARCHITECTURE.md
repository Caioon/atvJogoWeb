# PROJECT_ARCHITECTURE.md — ASCEND

---

## 1. Visão Geral

**O que o app faz e para quem**
ASCEND é um jogo multiplayer de corrida vertical em tempo real para navegador. Jogadores competem para subir plataformas geradas proceduralmente e tocar primeiro na bandeira no topo do mapa. Destinado a sessões casuais com múltiplos jogadores simultâneos na mesma rede/servidor.

**Stack de tecnologias**
- **Backend:** Node.js + Express (CommonJS)
- **Tempo real:** WebSocket nativo (API `ws` do Node.js)
- **Sessões:** express-session (memória, sem persistência)
- **Frontend:** Vanilla JavaScript com ES Modules
- **Renderização de jogo:** Canvas 2D API
- **CSS:** Vanilla CSS com variáveis custom
- **Sem framework de frontend, sem bundler, sem TypeScript**

**Padrão de arquitetura**
MPA (Multi-Page Application) server-rendered com páginas HTML estáticas e JavaScript modular no cliente. Sem SPA framework. O backend é uma aplicação Express monolítica com estado global em memória (objeto singleton `gameState`).

**Padrão de navegação**
Navegação por redirecionamento HTTP entre páginas distintas (`/`, `/lobby`, `/game`, `/waiting`). O roteador do servidor controla acesso e redirecionamentos com base no estado da partida.

**Padrão de gerenciamento de estado**
- **Servidor:** estado global centralizado em `gameState.js` (singleton em memória, compartilhado via `require`). Sem banco de dados, sem persistência entre reinicializações.
- **Cliente:** objeto `appState` em `state.js` (módulo ES singleton compartilhado entre os módulos de UI). Dados de sessão do usuário (nome do jogador) persistidos via `sessionStorage` do navegador.
- **Sincronização cliente-servidor:** polling HTTP a cada 1–2 segundos para estado de lobby/jogo; WebSocket nativo para posições em tempo real.

---

## 2. Estrutura de Pastas

```
atvProva/
├── server.js                  # Ponto de entrada: Express + WebSocket + sessões
├── routes/
│   └── pages.js               # Todas as rotas HTTP (páginas e API REST)
├── server/
│   ├── gameState.js           # Estado global do jogo (singleton em memória)
│   └── mapGen.js              # Geração procedural de mapas
├── views/
│   ├── index.html             # Tela de entrada de nome
│   ├── lobby.html             # Lobby de espera pré-partida
│   ├── game.html              # Tela de jogo com canvas
│   └── waiting.html           # Tela de espera para quem chegou depois da partida
└── public/
    ├── css/
    │   └── style.css          # Estilos globais com design system via CSS vars
    └── js/
        ├── main.js            # Dispatcher de tela (bootstrap do cliente)
        ├── state.js           # Estado global do cliente (singleton ES Module)
        ├── game/
        │   ├── game.js        # Loop principal do jogo, física e renderização
        │   ├── input.js       # Captura de teclado e controles mobile
        │   ├── socketClient.js# Comunicação WebSocket e interpolação de jogadores remotos
        │   ├── camera.js      # Classe Camera (definida mas não usada no game.js atual)
        │   └── platforms.js   # Array de plataformas hardcoded (não usado em produção)
        └── ui/
            ├── nameScreen.js  # Lógica da tela de registro de nome
            ├── lobbyScreen.js # Lógica do lobby: polling, renderização, countdown
            ├── gameScreen.js  # Orquestração da tela de jogo
            └── waitingScreen.js # Polling da tela de espera
```

---

## 3. Catálogo de Arquivos

### `./` (raiz)

| Arquivo | Responsabilidade | Classes/Funções Principais |
|---|---|---|
| `server.js` | Ponto de entrada da aplicação. Configura Express, sessões, WebSocket nativo e inicia o servidor HTTP. Contém lógica de sincronização de posições em tempo real. | — (script de inicialização) |

**Métodos públicos relevantes (server.js):**
- Sem exports. Configura `wss.on('connection', ...)` que gerencia o mapa `playerPositions` e emite `players` a cada 16ms por conexão WebSocket. O jogador se identifica enviando uma mensagem `{ type: 'identify', name }` logo após conectar.

**Dependências:** `express-session`, `ws`, `./routes/pages`, `./server/gameState` (implicitamente via rotas)

---

### `routes/`

| Arquivo | Responsabilidade |
|---|---|
| `pages.js` | Único arquivo de rotas. Centraliza todas as rotas de página (GET) e toda a API REST (POST/GET). Contém lógica de negócio do lobby e do jogo diretamente no handler das rotas. |

**Funções principais:**
- `requirePlayer(req, res, next)` — middleware: redireciona para `/` se sessão sem nome
- `requireGameAccess(req, res, next)` — middleware: verifica se partida está ativa e jogador está na partida
- `POST /api/register-name` — salva nome na sessão
- `POST /api/lobby/join` — adiciona jogador à `playersInLobby` com cor atribuída
- `GET /api/lobby/state` — retorna estado atual do lobby
- `POST /api/lobby/countdown/start` — inicia countdown (somente admin); ao chegar em zero, dispara início da partida e gera mapa
- `POST /api/lobby/countdown/cancel` — cancela countdown (somente admin)
- `POST /api/game/win` — marca vencedor e reseta estado do jogo
- `POST /api/game/leave` — remove jogador da partida; se sobrar 1, declara vencedor
- `POST /api/game/end` — reset total do estado (sem verificação de autenticação)
- `GET /api/game/state` — retorna status, jogadores na partida e último vencedor
- `GET /api/game/map` — retorna plataformas, goal e altura do mapa
- `GET /api/game/colors` — retorna mapa nome→cor dos jogadores na partida

**Dependências:** `express`, `path`, `../server/gameState`, `../server/mapGen`
**Quem depende:** `server.js` (importa este módulo)

---

### `server/`

| Arquivo | Responsabilidade |
|---|---|
| `gameState.js` | Singleton de estado global do servidor. Objeto mutable compartilhado por referência entre todos os módulos que fazem `require`. |
| `mapGen.js` | Geração procedural de plataformas e objetivo (bandeira) para cada partida. |

**gameState.js — campos relevantes:**
- `status` — `'waiting'` ou `'playing'`
- `countingDown`, `countdownValue`, `countdownTimer` — estado do countdown
- `playersInLobby` — array `{name, color}` de quem está no lobby
- `playersInMatch` — array `{name, color}` de quem entrou na partida atual
- `map`, `goal` — plataformas e objetivo gerados para a partida corrente
- `colors` — paleta de 8 cores usada para atribuir cor a cada jogador
- `lastWinner` — nome do último vencedor (persiste até próxima partida)

**mapGen.js — exports:**
- `generateMap()` — gera array de plataformas procedurais + objeto `goal` com posição da bandeira e poste
- `MAP_HEIGHT` — constante exportada (6000px)

**Dependências de mapGen.js:** nenhuma
**Dependências de gameState.js:** nenhuma
**Quem depende:** `routes/pages.js`, `server.js`

---

### `views/`

Quatro arquivos HTML estáticos servidos diretamente pelo Express. Não há template engine; o conteúdo dinâmico é injetado pelo JavaScript do cliente via DOM manipulation.

| Arquivo | Tela | data-page |
|---|---|---|
| `index.html` | Entrada de nome | `home` |
| `lobby.html` | Lobby pré-partida | `lobby` |
| `game.html` | Jogo | `game` |
| `waiting.html` | Espera (partida em curso) | `waiting` |

Todos importam `/js/main.js` como `type="module"`. Nenhum arquivo HTML carrega dependências externas de tempo real — a conexão WebSocket é estabelecida inteiramente via JavaScript do cliente.

---

### `public/css/`

| Arquivo | Responsabilidade |
|---|---|
| `style.css` | Estilos globais. Define design system via variáveis CSS em `:root` (cores, radius). Cobre todas as telas: name, lobby, game HUD, overlays de morte/vitória/derrota, controles mobile. |

---

### `public/js/`

| Arquivo | Responsabilidade |
|---|---|
| `main.js` | Bootstrap do cliente. Lê `data-page` do `<body>` e chama a função de inicialização da tela correspondente. Thin dispatcher sem lógica própria. |
| `state.js` | Singleton de estado do cliente. Exporta objeto `appState` mutável com `playerName`, `isAdmin`, estado de countdown e lista de jogadores. |

---

### `public/js/game/`

| Arquivo | Responsabilidade |
|---|---|
| `game.js` | Classe `Game`: loop de jogo (requestAnimationFrame), física do jogador (gravidade, colisão, coyote time), renderização (canvas 2D), callbacks `onDeath` e `onWin`. |
| `input.js` | Gerencia estado das teclas (`keys`, `pressed`). Inicializa controles mobile via touch events. |
| `socketClient.js` | Conecta ao servidor via WebSocket nativo (`new WebSocket(...)`), envia identificação do jogador ao abrir conexão, recebe posições de jogadores remotos, aplica interpolação linear (lerp) e snap por distância. Envia posição local. |
| `camera.js` | Classe `Camera` com método `update(player, canvas)`. **Definida mas não utilizada** — `game.js` implementa a câmera internamente como objeto literal. |
| `platforms.js` | Array hardcoded de 4 plataformas de teste. **Não utilizado em produção** — o mapa vem do servidor via API. |

**game.js — métodos públicos:**
- `start()` — redimensiona canvas, posiciona jogador no spawn, inicia loop
- `stop()` — para o loop e cancela o requestAnimationFrame
- `resize()` — atualiza dimensões do canvas
- `onDeath` (callback) — chamado quando jogador cai no vazio
- `onWin` (callback) — chamado quando jogador toca na bandeira

**socketClient.js — funções exportadas:**
- `initializeSocket(playerName, onReady)` — abre conexão WebSocket, envia `{ type: 'identify', name }` ao conectar, registra handler de mensagens do tipo `players`
- `updateRemotePlayers()` — aplica lerp/snap nos remotePlayers (chamado a cada frame pelo loop do jogo)
- `sendPosition(x, y)` — envia mensagem `{ type: 'position', x, y }` ao servidor via WebSocket
- `loadColors()` — busca mapa nome→cor via `GET /api/game/colors`
- `remotePlayers` — objeto exportado com posições interpoladas dos outros jogadores
- `playerColors` — objeto exportado com cores por nome de jogador

**input.js — exports:**
- `keys` — objeto com estado atual das teclas (pressionada/solta)
- `pressed` — objeto com teclas recém-pressionadas neste frame
- `clearPressed()` — limpa o objeto `pressed` após processamento do frame
- `initializeMobileControls()` — detecta dispositivo mobile e ativa botões touch

---

### `public/js/ui/`

| Arquivo | Responsabilidade |
|---|---|
| `nameScreen.js` | Captura nome do jogador, faz POST para `/api/register-name` e redireciona para `/lobby`. Salva nome em `sessionStorage` e `appState`. |
| `lobbyScreen.js` | Polling a cada 1s para `/api/lobby/state`. Renderiza lista de jogadores, exibe área de admin ou de convidado conforme posição na fila, dispara start/cancel de countdown. |
| `gameScreen.js` | Orquestra a tela de jogo: carrega cores e mapa, instancia `Game`, conecta socket, inicia polling para detectar vitória de outro jogador, gerencia overlays e navegação pós-jogo. |
| `waitingScreen.js` | Thin wrapper: polling a cada 2s para `/api/game/state`; quando `status !== 'playing'`, redireciona para `/lobby`. |

**lobbyScreen.js — funções:**
- `initializeLobby()` — entry point exportado
- `isAdmin()` — verifica se o jogador atual é o primeiro da lista (admin)
- `updateUI(data)` — atualiza visibilidade de áreas admin/guest e countdown
- `renderLobby()` — re-renderiza lista de jogadores no DOM
- `startCountdown()` / `cancelCountdown()` — chamam APIs de countdown

**gameScreen.js — funções:**
- `initializeGameScreen()` — entry point exportado; async; orquestra toda inicialização
- `startLossPoll()` — interna; polling para detectar vencedor externo

---

## 4. Mapa de Relações

### Fluxo de dados entre camadas

```
[HTML view] ──data-page──> main.js ──> ui/[tela]Screen.js
                                           │
                          ┌────────────────┼─────────────────────┐
                          ▼                ▼                     ▼
                      state.js      game/game.js          fetch() HTTP
                    (appState)      (loop + física)       │
                          │              │                 ▼
                          │         game/input.js    routes/pages.js
                          │         game/socketClient│      │
                          │              │           │  server/gameState.js
                          │          WebSocket ◄─────┘  server/mapGen.js
                          │              │
                          └──────────────┘
                                    │
                              server.js
                         (WebSocket: playerPositions)
```

### Fluxos principais

**1. Registro e entrada no lobby:**
`nameScreen.js` → `POST /api/register-name` → sessão salva no servidor → redirect `/lobby` → `lobbyScreen.js` → `POST /api/lobby/join` → jogador adicionado a `gameState.playersInLobby` com cor

**2. Início de partida (admin):**
`lobbyScreen.js` → `POST /api/lobby/countdown/start` → `routes/pages.js` inicia `setInterval` decrementando `gameState.countdownValue` → ao chegar em 0: `gameState.status = 'playing'`, `mapGen.generateMap()` chamado, resultado salvo em `gameState.map` e `gameState.goal` → clientes detectam via polling → redirect para `/game` (participantes) ou `/waiting` (retardatários)

**3. Loop de jogo:**
`gameScreen.js` → `loadColors()` + `GET /api/game/map` → instancia `Game` → `initializeSocket()` → ao abrir WebSocket: envia `identify`, chama `game.start()` + `startLossPoll()` → a cada frame: `game.update()` → `input.js` (teclas), física local, `updateRemotePlayers()` (lerp), `sendPosition()` (WebSocket send) → `game.draw()` (canvas 2D)

**4. Vitória (jogador local toca a bandeira):**
`game.onWin` → `POST /api/game/win` → servidor seta `gameState.lastWinner`, reseta estado → `overlayVictory` exibido

**5. Derrota (outro jogador venceu):**
`startLossPoll` polling `GET /api/game/state` → detecta `status !== 'playing' && lastWinner !== self` → `overlayLoss` exibido

**6. Morte (caiu no vazio):**
`game.onDeath` → `POST /api/game/leave` → servidor remove jogador de `playersInMatch`; se sobrar 1, declara vencedor → `overlayDeath` exibido

### Eixo central de estado

`gameState.js` no servidor é o único source of truth. Não há banco de dados; todo o estado é em memória. O cliente não mantém estado autoritativo — apenas reflete e reage ao que o servidor expõe via polling HTTP e WebSocket nativo.

`appState` no cliente é auxiliar: guarda nome do jogador e cache de lista de jogadores entre renders de polling.

---

## 5. Observações Arquiteturais

**Lógica de negócio no lugar errado**
- `routes/pages.js` acumula toda a lógica de negócio do lobby e do jogo (validação de admin, lógica de countdown, controle de vencedor, limpeza de estado) dentro dos handlers de rota. Esse arquivo faz as vezes de controller, service e repositório ao mesmo tempo.
- `gameScreen.js` contém lógica de negócio não trivial: polling de estado, detecção de vitória de terceiros (`startLossPoll`), chamadas de API de resultado. Poderia estar em uma camada de serviço separada.

**Inconsistências de padrão**
- `camera.js` define uma classe `Camera` que não é usada em nenhum lugar — `game.js` implementa câmera internamente como `this.camera = { x: 0, y: 0 }`.
- `platforms.js` exporta um array hardcoded de plataformas que não é importado por nenhum arquivo do projeto. É um artefato de desenvolvimento inicial não removido.
- `player.js` define uma classe `Player` que nunca é instanciada — `game.js` cria o jogador como objeto literal diretamente.
- O campo `isAdmin` em `appState` (cliente) é inicializado como `true` e nunca é atualizado. A verificação real de admin é feita em `lobbyScreen.js` via `isAdmin()` (função local que compara posição na lista), tornando o campo do `appState` um dado morto.

**Arquivos acumulando responsabilidades**
- `routes/pages.js`: rotas de página, autenticação (middleware), registro de nome, toda a API de lobby, toda a API de jogo, geração de mapa (indireta). Candidato principal a divisão em módulos separados.
- `server.js`: configuração do servidor e toda a lógica de sincronização de posições em tempo real via WebSocket (poderia estar em módulo separado de handler WebSocket).

**Bugs potenciais e riscos**
- **Sem validação de nome duplicado:** `POST /api/lobby/join` não verifica se já existe outro jogador com o mesmo nome. Dois jogadores com o mesmo nome causam colisão no mapa `playerPositions` do servidor e no mapa `playerColors`, com comportamento indefinido na renderização.
- **Race condition no countdown:** o servidor usa `setInterval` diretamente em `gameState.countdownTimer`. Se múltiplas requisições `POST /api/lobby/countdown/start` chegarem simultaneamente (improvável mas possível), o guard `if (gameState.countingDown)` pode não ser suficiente em Node.js com I/O assíncrono no mesmo tick.
- **`POST /api/game/end` sem autenticação:** essa rota não usa `requirePlayer` e não verifica nenhuma permissão. Qualquer requisição anônima pode resetar o estado do jogo imediatamente.
- **Posições de jogadores mortos permanecem visíveis:** `playerPositions` em `server.js` é limpo apenas no evento `close` do WebSocket. Se um jogador morrer e ficar na tela de overlay sem desconectar, sua posição continua sendo transmitida e renderizada para outros jogadores.
- **Estado de lobby não limpo ao entrar em nova partida:** `gameState.playersInLobby` é esvaziado apenas quando `POST /api/game/win` ou `POST /api/game/leave` é chamado. Se jogadores não chamarem essas rotas (fechar aba), o lobby fica poluído com nomes de sessões antigas.
- **`lossPoll` e `pollTimer` não cancelados em todos os caminhos:** se o jogador fechar a aba durante uma partida, o `clearInterval` nunca é chamado (só existe em handlers de eventos DOM e callbacks de jogo).

**Funcionalidades incompletas**
- A tela `waiting.html` não exibe o nome do vencedor da partida atual — apenas informa que há uma partida em andamento. O campo `lastWinner` está disponível via `GET /api/game/state` mas não é consumido por `waitingScreen.js`.
- `Camera` e `Player` como classes separadas sugerem intenção de separação de responsabilidades que não foi completada — toda a lógica ainda está centralizada em `game.js`.
- `POST /api/game/end` existe mas não é chamado por nenhum cliente — é uma rota de reset administrativo sem UI associada.

**Problemas de performance previsíveis**
- O servidor emite `playerPositions` completo a cada 16ms **por conexão WebSocket** (um `setInterval` por conexão). Com N jogadores, isso gera N intervalos de 16ms cada, todos transmitindo o mapa inteiro. Não é broadcast global — é N transmissões individuais redundantes.
- O polling HTTP de lobby e jogo (`lobbyScreen.js` a cada 1s, `gameScreen.js` a cada 1s, `waitingScreen.js` a cada 2s) cria requisições desnecessárias; com muitos jogadores simultâneos no lobby, isso escala mal. A conexão WebSocket já está disponível durante a partida e poderia ser estendida para substituir o polling.
- O mapa gerado tem 42 plataformas para um `MAP_HEIGHT` de 6000px. O cliente baixa esse array inteiro via `GET /api/game/map` a cada partida, o que é aceitável no tamanho atual mas não escalaria para mapas maiores.
