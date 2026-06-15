# ASCEND

Jogo multiplayer de corrida vertical em tempo real para navegador (desktop e mobile, crossplay). Jogadores competem para subir plataformas geradas proceduralmente e tocar primeiro na bandeira no topo do mapa.

---

## O que dá pra fazer

- **Entrar com um nome** — sem cadastro, sem senha. Só digitar um nome e entrar.
- **Lobby com vários jogadores** — todos que entram aparecem no lobby em tempo real. Cada jogador recebe uma cor única automaticamente.
- **Iniciar a partida** — o primeiro jogador a entrar vira o administrador e pode iniciar um countdown de 10 segundos. Qualquer um pode cancelar antes de zerar.
- **Jogar em tempo real** — cada jogador controla seu personagem no mesmo mapa simultaneamente. As posições dos outros jogadores aparecem na tela com movimento suave.
- **Mapa procedural** — a cada partida, um novo mapa é gerado. As plataformas nunca são as mesmas.
- **Vencer chegando primeiro** — quem tocar a bandeira no topo do mapa primeiro vence. Os outros veem uma tela de derrota com o nome do vencedor.
- **Morrer caindo** — se cair no vazio abaixo das plataformas, o jogador é eliminado e vai para uma tela de espera.
- **Suporte a mobile** — controles de toque aparecem automaticamente em dispositivos móveis.
- **Entrar em espera** — quem tentar entrar com uma partida já em andamento vai para uma tela de espera e cai no lobby assim que a partida terminar.

---

## Como rodar localmente

**Pré-requisitos:** Node.js instalado.

```bash
# Instalar dependências
npm install

# Iniciar o servidor
node server.js
```

Acesse `http://localhost:3000` no navegador. Para jogar com mais pessoas na mesma rede, os outros acessam pelo IP da máquina que está rodando o servidor.

---

## Controles

| Ação | Teclado |
|---|---|
| Mover esquerda/direita | ← → |
| Pular | W ou Espaço |

Em dispositivos móveis, botões de toque aparecem automaticamente na tela.

---

## Observações

- O estado do jogo é mantido em memória — reiniciar o servidor reseta tudo.
- Não há limite fixo de jogadores, mas o jogo é pensado para sessões casuais em rede local.
- Não há sistema de contas ou histórico de partidas.


# Mais detalhes da arquitetura do projeto no arquivo PROJECT_ARCHITECTURE.md
