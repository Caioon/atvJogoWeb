import { appState } from '../state.js';
import { keys, pressed, clearPressed } from './input.js';
import { remotePlayers, playerColors, updateRemotePlayers, sendPosition } from './socketClient.js';

const GRAVITY      = 0.55;
const JUMP_FORCE   = -13;
const MOVE_SPEED   = 4;

const PLAYER_W     = 28;
const PLAYER_H     = 28;
const COYOTE_FRAMES = 30;

const FALLBACK_COLOR = '#f76a6a';

export class Game {

  constructor(canvas, platforms, goal, mapHeight) {

    this.canvas    = canvas;
    this.ctx       = canvas.getContext('2d');
    this.platforms = platforms;
    this.goal      = goal;
    this.mapHeight = mapHeight;

    this.player = {
      x: 0, y: 0,
      vx: 0, vy: 0,
      onGround: false,
      coyoteFrames: 0,
      dead: false
    };

    this.camera  = { x: 0, y: 0 };
    this.running = false;
    this.rafId   = null;
    this.onDeath = null;
    this.onWin   = null;
  }

  start() {
    this.resize();
    this.initPlayer();
    this.running = true;
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  resize() {
    this.canvas.width  = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
  }

  initPlayer() {
    const spawn = this.platforms[0];
    this.player.x = spawn.x + spawn.w / 2 - PLAYER_W / 2;
    this.player.y = spawn.y - PLAYER_H;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.onGround = false;
    this.player.dead = false;
  }

  updateCamera() {
    this.camera.x = this.player.x + PLAYER_W / 2 - this.canvas.width / 2;
    this.camera.y = this.player.y + PLAYER_H / 2 - this.canvas.height * 0.6;
  }

  checkGoal() {

    const p = this.player;
    const f = this.goal;

    // Colisão AABB player x bandeira
    return (
      p.x < f.flagX + f.flagW &&
      p.x + PLAYER_W > f.flagX &&
      p.y < f.flagY + f.flagH &&
      p.y + PLAYER_H > f.flagY
    );
  }

  update() {

    updateRemotePlayers();

    const player = this.player;
    if (player.dead) return;

    player.vx = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) player.vx = -MOVE_SPEED;
    if (keys['ArrowRight'] || keys['KeyD']) player.vx = MOVE_SPEED;

    const jumpPressed =
      pressed['Space'] || pressed['KeyW'] || pressed['ArrowUp'];

    if (jumpPressed && (player.onGround || player.coyoteFrames > 0)) {
      player.vy = JUMP_FORCE;
      player.onGround = false;
      player.coyoteFrames = 0;
    }

    player.vy += GRAVITY;
    player.x  += player.vx;
    player.y  += player.vy;
    player.onGround = false;

    for (const platform of this.platforms) {
      if (
        player.x + PLAYER_W > platform.x &&
        player.x < platform.x + platform.w
      ) {
        const prevBottom = player.y + PLAYER_H - player.vy;
        const currBottom = player.y + PLAYER_H;
        if (prevBottom <= platform.y && currBottom >= platform.y) {
          player.y = platform.y - PLAYER_H;
          player.vy = 0;
          player.onGround = true;
          player.coyoteFrames = COYOTE_FRAMES;
        }
      }
    }

    if (!player.onGround) {
      player.coyoteFrames = Math.max(0, player.coyoteFrames - 1);
    }

    // Morte
    if (player.y > this.mapHeight + 100) {
      player.dead = true;
      this.stop();
      this.onDeath && this.onDeath();
      return;
    }

    // Vitória: tocou na bandeira
    if (this.checkGoal()) {
      player.dead = true;
      this.stop();
      this.onWin && this.onWin();
      return;
    }

    this.updateCamera();
    clearPressed();
    sendPosition(player.x, player.y);
  }

  drawGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(46,46,61,0.5)';
    ctx.lineWidth = 1;
    const gridSize = 48;
    const offsetX = ((-this.camera.x) % gridSize + gridSize) % gridSize;
    const offsetY = ((-this.camera.y) % gridSize + gridSize) % gridSize;
    for (let x = offsetX; x < this.canvas.width; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.canvas.height); ctx.stroke();
    }
    for (let y = offsetY; y < this.canvas.height; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.canvas.width, y); ctx.stroke();
    }
  }

  drawPlatforms() {
    const ctx = this.ctx;
    for (const platform of this.platforms) {
      ctx.fillStyle = '#1a1a22';
      ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
      ctx.fillStyle = '#3a3a52';
      ctx.fillRect(platform.x, platform.y, platform.w, 2);
    }
  }

  drawGoal() {
    const ctx = this.ctx;
    const g = this.goal;

    // Poste
    ctx.fillStyle = '#aaaacc';
    ctx.fillRect(g.poleX, g.poleY, g.poleW, g.poleH);

    // Bandeira
    ctx.fillStyle = '#f7d46a';
    ctx.fillRect(g.flagX, g.flagY, g.flagW, g.flagH);

    // Brilho na bandeira
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(g.flagX + 2, g.flagY + 2, g.flagW - 4, 5);
  }

  drawCharacter(ctx, x, y, color, name) {
    const r = parseInt(color.slice(1,3), 16);
    const g = parseInt(color.slice(3,5), 16);
    const b = parseInt(color.slice(5,7), 16);
    ctx.fillStyle = `rgba(${r},${g},${b},0.15)`;
    ctx.fillRect(x + 2, y + PLAYER_H + 2, PLAYER_W - 4, 5);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, PLAYER_W, PLAYER_H);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x + 4, y + 4, PLAYER_W - 8, 5);
    ctx.font = '11px "Courier New", monospace';
    ctx.fillStyle = '#e8e8f0';
    ctx.textAlign = 'center';
    ctx.fillText(name, x + PLAYER_W / 2, y - 7);
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#0f0f13';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawGrid();
    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);
    this.drawPlatforms();
    this.drawGoal();
    for (const [name, pos] of Object.entries(remotePlayers)) {
      const color = playerColors[name] || FALLBACK_COLOR;
      this.drawCharacter(ctx, pos.x, pos.y, color, name);
    }
    this.drawCharacter(
      ctx, this.player.x, this.player.y,
      playerColors[appState.playerName] || '#7c6af7',
      appState.playerName
    );
    ctx.restore();
  }

  loop = () => {
    if (!this.running) return;
    this.update();
    this.draw();
    this.rafId = requestAnimationFrame(this.loop);
  };
}
