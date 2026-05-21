import { GameState, Player, Bullet, Enemy, Vector, Difficulty, StageInfo, Rarity, Module, BossPhase, Gimmick } from '../types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PLAYER_RADIUS,
  PLAYER_MAX_HEALTH,
  BULLET_RADIUS,
  STAGES,
  DIFFICULTY_SETTINGS,
  MODULE_POOL,
  SHIP_SETTINGS,
  HITBOX_RADIUS,
  GRAZE_RADIUS,
  TAU,
  SPECIAL_COST,
  MAX_SPECIAL_METER,
  ENEMY_SPEED,
  ENEMY_RADIUS,
  MINIBOSS_PHASES,
  BOSS_PHASES,
  ACT_BOSS_PHASES,
} from '../constants';
import { audioService } from '../services/audioService';

export class GameEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private state: GameState = 'MENU';
  private difficulty: Difficulty = 'STABLE';
  private currentStageIndex: number = 0;
  private player: Player;
  private selectedShipType: 'VOTIVE_ORB' | 'PULSE_NODE' | 'VOID_SPIRE' = 'VOTIVE_ORB';
  private bullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  private keys: Record<string, boolean> = {};
  private lastTime: number = 0;
  private lastShot: number = 0;
  private enemiesSpawned: number = 0;
  private onStateChange: (state: GameState) => void;
  private onUpdate: (player: Player) => void;
  private effects: { type: string, pos: Vector, radius: number, life: number, maxLife: number }[] = [];
  private playerTilt: number = 0;
  private votiveOrbAngle: number = 0;
  private playerTrails: { pos: Vector, life: number, maxLife: number }[] = [];
  private particles: { pos: Vector, vel: Vector, life: number, maxLife: number, radius: number, color: string }[] = [];
  private waveTimer: number = 0;
  private hitFlashTimer: number = 0;

  // PULSE_NODE dash state (JSAB mechanics)
  private dashCooldown: number = 0;
  private dashDuration: number = 0;
  private dashVel: Vector = { x: 0, y: 0 };
  private dashInvuln: boolean = false;
  private cubeRotation: number = 0;
  private dashSquish: number = 0;
  private dashTrails: { pos: Vector; rot: number; life: number; maxLife: number }[] = [];
  private readonly DASH_MAX_DURATION = 0.16;
  private readonly DASH_MAX_COOLDOWN = 1.4;

  // Boss phase system
  private bossPhases: BossPhase[] = [];
  private currentBossPhaseIdx: number = 0;
  private phaseHitDuringSpecial: boolean = false;
  private phaseTransitionTimer: number = 0;
  private bossFireAngle: number = 0;
  private phaseNotif: { text: string; life: number; maxLife: number } | null = null;
  private bossTarget: Vector = { x: CANVAS_WIDTH / 2, y: 200 };
  private bossMoveTimer: number = 0;
  private gimmicks: Gimmick[] = [];
  private gimmickHitTimer: number = 0;

  // JSAB-style motion & feel
  private screenShakeTrauma: number = 0;
  private screenShakeOffset: Vector = { x: 0, y: 0 };
  private playerSquish: Vector = { x: 1, y: 1 };
  private voidSpireAngle: number = -Math.PI / 2;
  private bgPulse: { color: string; life: number; maxLife: number } | null = null;
  private bossHitFlash: number = 0;

  // Module state
  private kineticMult: number = 1;

  // VOID Stack mechanic (VOID_SPIRE exclusive)
  private voidStacks: number = 0;
  private voidStackTimer: number = 0;

  // Spell Card Announce Freeze
  private spellAnnounceFreezeTimer: number = 0;

  // DEPTH_SCROLL background parallax
  private depthScrollY: number = 0;

  // Graze mechanic
  private grazedBulletIds = new Set<string>();
  private grazeStreak: number = 0;
  private grazeStreakTimer: number = 0;
  private grazeFlashes: { pos: Vector; life: number; maxLife: number }[] = [];
  private grazeAudioThrottle: number = 0;

  // VOID_SPIRE Void Convert special
  private voidConvertRings: { pos: Vector; maxRadius: number; life: number; maxLife: number; dashOffset: number }[] = [];
  private voidAbsorbFlashes: { pos: Vector; life: number; maxLife: number }[] = [];
  private voidCenterFlash: { pos: Vector; life: number; maxLife: number } | null = null;

  constructor(onStateChange: (state: GameState) => void, onUpdate: (player: Player) => void) {
    this.onStateChange = onStateChange;
    this.onUpdate = onUpdate;
    this.player = this.resetPlayer();
    
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      
      if (e.code === 'Space') {
        if (this.player.shipType === 'PULSE_NODE') {
          this.triggerDash();
        } else {
          this.useSpecial();
        }
      }
      
      if (e.code === 'AltLeft' || e.code === 'AltRight' || e.code === 'CapsLock') {
        this.switchFireMode();
        e.preventDefault();
      }

      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'AltLeft', 'AltRight', 'CapsLock'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => (this.keys[e.code] = false));
    window.addEventListener('blur', () => { this.keys = {}; });
  }

  public setShipType(type: 'VOTIVE_ORB' | 'PULSE_NODE' | 'VOID_SPIRE') {
    this.selectedShipType = type;
    this.player = this.resetPlayer();
  }

  private resetPlayer(): Player {
    return {
      id: 'player',
      pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT * 0.8 },
      vel: { x: 0, y: 0 },
      radius: PLAYER_RADIUS,
      health: PLAYER_MAX_HEALTH,
      maxHealth: PLAYER_MAX_HEALTH,
      rank: 'ALPHA',
      experience: 0,
      level: 1,
      integrity: 100,
      syncRate: 100,
      lastPos: { x: 0, y: 0 },
      kills: 0,
      damageTaken: 0,
      bombs: DIFFICULTY_SETTINGS[this.difficulty]?.initialBombs || 3,
      fireMode: 'PRIMARY',
      specialMeter: 0,
      maxSpecialMeter: 100,
      shipType: this.selectedShipType,
    };
  }

  private isInitialized = false;

  public init(canvas: HTMLCanvasElement) {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    console.log('[GameEngine] init() — canvas:', canvas.width, 'x', canvas.height, '| ctx:', this.ctx ? 'OK' : 'NULL (getContext failed!)');
    this.startLoop();
  }

  public setDifficulty(diff: Difficulty) {
    this.difficulty = diff;
    this.setState('PLAYING');
  }

  public setState(state: GameState) {
    this.state = state;
    this.onStateChange(state);
    
    if (state === 'MENU') {
      this.currentStageIndex = 0;
      audioService.playMusic('/assets/audio/theme/menu.mp3');
    } else if (state === 'PLAYING') {
      const stage = STAGES[this.currentStageIndex];
      if (stage.type === 'BOSS' || stage.type === 'MINIBOSS' || stage.type === 'ACT_BOSS') {
        audioService.playMusic('/assets/audio/theme/boss.mp3');
      } else {
        audioService.playMusic('/assets/audio/theme/stage.mp3');
      }

      if (this.currentStageIndex === 0) {
        this.player = this.resetPlayer();
      }
      this.bullets = [];
      this.enemies = [];
      this.particles = [];
      this.enemiesSpawned = 0;
      this.waveTimer = 0;
      this.dashCooldown = 0;
      this.dashDuration = 0;
      this.dashInvuln = false;
      this.dashSquish = 0;
      this.dashTrails = [];
      this.bossPhases = [];
      this.currentBossPhaseIdx = 0;
      this.phaseHitDuringSpecial = false;
      this.phaseTransitionTimer = 0;
      this.bossFireAngle = 0;
      this.phaseNotif = null;
      this.bossTarget = { x: CANVAS_WIDTH / 2, y: 200 };
      this.bossMoveTimer = 0;
      this.gimmicks = [];
      this.gimmickHitTimer = 0;
      this.screenShakeTrauma = 0;
      this.screenShakeOffset = { x: 0, y: 0 };
      this.playerSquish = { x: 1, y: 1 };
      this.voidSpireAngle = -Math.PI / 2;
      this.bgPulse = null;
      this.bossHitFlash = 0;
      this.voidStacks = 0;
      this.voidStackTimer = 0;
      this.spellAnnounceFreezeTimer = 0;
      this.depthScrollY = 0;
      this.spawnInitialEnemies();
    } else if (state === 'VICTORY') {
      audioService.playMusic('/assets/audio/theme/victory.mp3');
    }
  }

  private startLoop() {
    console.log('[GameEngine] startLoop() — game loop starting');
    let drawCallCount = 0;
    const loop = (time: number) => {
      if (this.lastTime === 0) {
        this.lastTime = time;
        requestAnimationFrame(loop);
        return;
      }
      const dt = Math.min((time - this.lastTime) / 1000, 0.05);
      this.lastTime = time;

      if (this.state === 'PLAYING') {
        try {
          this.update(dt);
        } catch (err) {
          console.error('[GameEngine] UPDATE error:', err);
        }
        try {
          this.draw();
          if (drawCallCount < 3) {
            console.log('[GameEngine] draw() call #' + ++drawCallCount + ' — ctx:', !!this.ctx);
          }
        } catch (err) {
          console.error('[GameEngine] DRAW error:', err);
        }
      }

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private spawnInitialEnemies() {
    const stage = STAGES[this.currentStageIndex];
    if (stage.type === 'NORMAL') {
      this.spawnEnemy();
    } else {
      this.spawnBoss(stage.type as 'MINIBOSS' | 'BOSS' | 'ACT_BOSS');
    }
  }

  private spawnEnemy() {
    const stage = STAGES[this.currentStageIndex];
    const maxEnemies = stage.enemyCount * DIFFICULTY_SETTINGS[this.difficulty].enemyCountMultiplier;
    if (this.enemiesSpawned >= maxEnemies) return;

    const diff = DIFFICULTY_SETTINGS[this.difficulty];
    const progress = this.enemiesSpawned / maxEnemies; // 0.0 → 1.0 within this stage

    // Type composition ramps gradually across the stage (Touhou-style introduction)
    let enemyType: 'STRIKER' | 'VOLT' | 'BASTION' = 'STRIKER';
    if (stage.number === 1) {
      if (progress < 0.35) {
        enemyType = 'STRIKER';
      } else if (progress < 0.68) {
        enemyType = Math.random() < 0.5 ? 'STRIKER' : 'VOLT';
      } else {
        const r = Math.random();
        enemyType = r < 0.33 ? 'STRIKER' : r < 0.66 ? 'VOLT' : 'BASTION';
      }
    } else if (stage.number === 3) {
      if (progress < 0.2) {
        enemyType = Math.random() < 0.55 ? 'STRIKER' : 'VOLT';
      } else {
        const r = Math.random();
        enemyType = r < 0.25 ? 'STRIKER' : r < 0.58 ? 'VOLT' : 'BASTION';
      }
    } else if (stage.number === 5) {
      if (progress < 0.15) {
        enemyType = Math.random() < 0.45 ? 'VOLT' : 'BASTION';
      } else {
        const r = Math.random();
        enemyType = r < 0.15 ? 'STRIKER' : r < 0.45 ? 'VOLT' : 'BASTION';
      }
    }

    if (enemyType === 'VOLT') {
      const fromLeft = Math.random() < 0.5;
      const spawnY = 80 + Math.random() * (CANVAS_HEIGHT * 0.45);
      this.enemies.push({
        id: `enemy-${Date.now()}-${this.enemiesSpawned}`,
        pos: { x: fromLeft ? -ENEMY_RADIUS : CANVAS_WIDTH + ENEMY_RADIUS, y: spawnY },
        vel: { x: fromLeft ? 3.5 : -3.5, y: 0 },
        radius: ENEMY_RADIUS - 5,
        health: 20 * diff.multiplier,
        maxHealth: 20 * diff.multiplier,
        type: 'VOLT',
        scoreValue: 150,
        fireRate: 1500 / diff.multiplier,
        lastFired: Date.now() + 600,
        sweepDir: fromLeft ? 1 : -1,
        angle: 0,
        phase: 0,
      });
    } else if (enemyType === 'BASTION') {
      const spawnX = CANVAS_WIDTH * 0.2 + Math.random() * CANVAS_WIDTH * 0.6;
      this.enemies.push({
        id: `enemy-${Date.now()}-${this.enemiesSpawned}`,
        pos: { x: spawnX, y: -60 },
        vel: { x: 0, y: 1.0 },
        radius: ENEMY_RADIUS + 10,
        health: 80 * diff.multiplier,
        maxHealth: 80 * diff.multiplier,
        type: 'BASTION',
        scoreValue: 250,
        fireRate: 2500 / diff.multiplier,
        lastFired: Date.now() + 1200,
        targetY: 200 + Math.random() * 180,
        phase: 0,
        angle: 0,
        spawnX: spawnX,
        phaseTimer: 5 + Math.random() * 3,
      });
    } else {
      // STRIKER — descends, hovers, fires aimed shots, then exits
      this.enemies.push({
        id: `enemy-${Date.now()}-${this.enemiesSpawned}`,
        pos: { x: Math.random() * (CANVAS_WIDTH - 100) + 50, y: -50 },
        vel: { x: (Math.random() - 0.5) * 2, y: ENEMY_SPEED },
        radius: ENEMY_RADIUS,
        health: 30 * diff.multiplier,
        maxHealth: 30 * diff.multiplier,
        type: 'STRIKER',
        scoreValue: 100,
        fireRate: 2000 / diff.multiplier,
        lastFired: Date.now(),
        targetY: 80 + Math.random() * 200,
        phase: 0,
        phaseTimer: 3 + Math.random() * 2,
        moveTimer: 1 + Math.random() * 1.5,
      });
    }
    this.enemiesSpawned++;
  }

  private spawnFormation(type: 'SNAKE' | 'V_DIVE' | 'PINCER' | 'GRID_WEAVE' | 'RICOCHET', maxEnemies: number) {
    const diff = DIFFICULTY_SETTINGS[this.difficulty];
    const now = Date.now();

    if (type === 'SNAKE') {
      // 6 enemies sweep from one side, each oscillating with a phase offset — creates a snake curve
      const fromLeft = Math.random() < 0.5;
      const startY = 120 + Math.random() * 280;
      const count = Math.min(6, maxEnemies - this.enemiesSpawned);
      for (let i = 0; i < count; i++) {
        this.enemies.push({
          id: `enemy-${now}-sn${i}`,
          pos: { x: fromLeft ? -ENEMY_RADIUS - i * 65 : CANVAS_WIDTH + ENEMY_RADIUS + i * 65, y: startY },
          vel: { x: fromLeft ? 3.5 : -3.5, y: 0 },
          radius: ENEMY_RADIUS - 5,
          health: 25 * diff.multiplier,
          maxHealth: 25 * diff.multiplier,
          type: 'STRIKER',
          scoreValue: 120,
          fireRate: 2800 / diff.multiplier,
          lastFired: now + 800 + i * 150,
          phase: 1,
          phaseTimer: 999,
          formation: 'SNAKE',
          formationIndex: i,
          formationTimer: 0,
        });
        this.enemiesSpawned++;
      }
    } else if (type === 'V_DIVE') {
      // Classic Galaga-style V formation dives from top
      const offsets = [
        { x: 0, y: 0 }, { x: -130, y: 70 }, { x: 130, y: 70 },
        { x: -260, y: 140 }, { x: 260, y: 140 },
      ];
      const centerX = 400 + Math.random() * (CANVAS_WIDTH - 800);
      const count = Math.min(offsets.length, maxEnemies - this.enemiesSpawned);
      for (let i = 0; i < count; i++) {
        this.enemies.push({
          id: `enemy-${now}-v${i}`,
          pos: { x: centerX + offsets[i].x, y: -ENEMY_RADIUS - offsets[i].y },
          vel: { x: 0, y: ENEMY_SPEED * 1.5 },
          radius: ENEMY_RADIUS,
          health: 30 * diff.multiplier,
          maxHealth: 30 * diff.multiplier,
          type: 'STRIKER',
          scoreValue: 130,
          fireRate: 2200 / diff.multiplier,
          lastFired: now + i * 120,
          targetY: 130 + Math.random() * 120,
          phase: 0,
          phaseTimer: 3 + Math.random() * 1.5,
          moveTimer: 1 + Math.random() * 1.5,
          formation: 'V_DIVE',
          formationIndex: i,
          formationTimer: 0,
        });
        this.enemiesSpawned++;
      }
    } else if (type === 'PINCER') {
      // 2 pairs rush simultaneously from both sides — converging lines
      const yRows = [160, 300];
      const rowCount = Math.min(2, Math.floor((maxEnemies - this.enemiesSpawned) / 2));
      for (let i = 0; i < rowCount; i++) {
        this.enemies.push(
          {
            id: `enemy-${now}-pL${i}`,
            pos: { x: -ENEMY_RADIUS, y: yRows[i] },
            vel: { x: 4.5, y: 0 },
            radius: ENEMY_RADIUS - 5,
            health: 22 * diff.multiplier,
            maxHealth: 22 * diff.multiplier,
            type: 'VOLT',
            scoreValue: 140,
            fireRate: 2500 / diff.multiplier,
            lastFired: now + i * 200,
            sweepDir: 1, angle: 0, phase: 0,
            formation: 'PINCER', formationIndex: i * 2, formationTimer: 0,
          },
          {
            id: `enemy-${now}-pR${i}`,
            pos: { x: CANVAS_WIDTH + ENEMY_RADIUS, y: yRows[i] },
            vel: { x: -4.5, y: 0 },
            radius: ENEMY_RADIUS - 5,
            health: 22 * diff.multiplier,
            maxHealth: 22 * diff.multiplier,
            type: 'VOLT',
            scoreValue: 140,
            fireRate: 2500 / diff.multiplier,
            lastFired: now + i * 200,
            sweepDir: -1, angle: 0, phase: 0,
            formation: 'PINCER', formationIndex: i * 2 + 1, formationTimer: 0,
          }
        );
        this.enemiesSpawned += 2;
      }
    } else if (type === 'GRID_WEAVE') {
      // 3x3 grid — columns orbit 120° out of phase, creating a pinwheel optical illusion
      const cols = 3, rows = 3;
      const spX = 130, spY = 110;
      const cx = CANVAS_WIDTH / 2;
      const total = Math.min(cols * rows, maxEnemies - this.enemiesSpawned);
      let idx = 0;
      for (let row = 0; row < rows && idx < total; row++) {
        for (let col = 0; col < cols && idx < total; col++, idx++) {
          this.enemies.push({
            id: `enemy-${now}-gw${idx}`,
            pos: { x: cx + (col - 1) * spX, y: -80 - row * spY },
            vel: { x: 0, y: 1.2 },
            radius: ENEMY_RADIUS,
            health: 35 * diff.multiplier,
            maxHealth: 35 * diff.multiplier,
            type: 'STRIKER',
            scoreValue: 160,
            fireRate: 2800 / diff.multiplier,
            lastFired: now + 1200 + row * 300,
            targetY: 100 + row * spY,
            phase: 0, phaseTimer: 7, angle: 0,
            formation: 'GRID_WEAVE',
            formationIndex: row * cols + col,
            formationTimer: 0,
          });
          this.enemiesSpawned++;
        }
      }
    } else if (type === 'RICOCHET') {
      // Single high-HP enemy ricochets diagonally off walls like Breakout
      if (this.enemiesSpawned >= maxEnemies) return;
      const diagonals = [Math.PI * 0.3, Math.PI * 0.7, Math.PI * 1.3, Math.PI * 1.7];
      const startAngle = diagonals[Math.floor(Math.random() * diagonals.length)];
      const spd = 4.5;
      this.enemies.push({
        id: `enemy-${now}-rc`,
        pos: { x: 350 + Math.random() * (CANVAS_WIDTH - 700), y: 80 },
        vel: { x: Math.cos(startAngle) * spd, y: Math.abs(Math.sin(startAngle)) * spd },
        radius: ENEMY_RADIUS,
        health: 70 * diff.multiplier,
        maxHealth: 70 * diff.multiplier,
        type: 'VOLT',
        scoreValue: 350,
        fireRate: 1000 / diff.multiplier,
        lastFired: now + 400,
        sweepDir: 1, angle: 0, phase: 0,
        formation: 'RICOCHET',
        formationIndex: 0,
        formationTimer: 0,
      });
      this.enemiesSpawned++;
    }
  }

  private spawnBoss(type: 'MINIBOSS' | 'BOSS' | 'ACT_BOSS') {
    const hpMult = DIFFICULTY_SETTINGS[this.difficulty].bossHealthMultiplier;
    this.bossPhases = type === 'MINIBOSS' ? MINIBOSS_PHASES : type === 'BOSS' ? BOSS_PHASES : ACT_BOSS_PHASES;
    this.currentBossPhaseIdx = 0;
    this.phaseHitDuringSpecial = false;
    this.phaseTransitionTimer = 0;
    this.bossFireAngle = 0;
    this.phaseNotif = null;

    const phase0 = this.bossPhases[0];
    const radius = type === 'ACT_BOSS' ? 90 : type === 'BOSS' ? 80 : 50;
    this.enemies.push({
      id: `boss-${Date.now()}`,
      pos: { x: CANVAS_WIDTH / 2, y: -120 },
      vel: { x: 2, y: 1 },
      radius,
      health: phase0.hp * hpMult,
      maxHealth: phase0.hp * hpMult,
      type,
      scoreValue: type === 'ACT_BOSS' ? 20000 : type === 'BOSS' ? 5000 : 2000,
      fireRate: 9999,
      lastFired: Date.now() + 2000,
      pattern: phase0.pattern,
    });
  }

  private update(dt: number) {
    const stage = STAGES[this.currentStageIndex];
    const shipCfg = SHIP_SETTINGS[this.player.shipType];

    // Player movement with acceleration/deceleration
    const isFocus = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const targetSpeed = (isFocus ? shipCfg.focusSpeed : shipCfg.normalSpeed) * (dt * 60);

    const moveX = (this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0) - (this.keys['KeyA'] || this.keys['ArrowLeft'] ? 1 : 0);
    const moveY = (this.keys['KeyS'] || this.keys['ArrowDown'] ? 1 : 0) - (this.keys['KeyW'] || this.keys['ArrowUp'] ? 1 : 0);

    // Normalize input vector
    let inputX = moveX;
    let inputY = moveY;
    if (moveX !== 0 && moveY !== 0) {
      const len = Math.sqrt(moveX * moveX + moveY * moveY);
      inputX /= len;
      inputY /= len;
    }

    const targetVelX = inputX * targetSpeed;
    const targetVelY = inputY * targetSpeed;

    const accel = shipCfg.acceleration;
    const decel = shipCfg.deceleration;

    // Apply acceleration/deceleration to velocity
    if (inputX !== 0) {
      this.player.vel.x += (targetVelX - this.player.vel.x) * accel;
    } else {
      this.player.vel.x += (0 - this.player.vel.x) * decel;
    }

    if (inputY !== 0) {
      this.player.vel.y += (targetVelY - this.player.vel.y) * accel;
    } else {
      this.player.vel.y += (0 - this.player.vel.y) * decel;
    }

    // PULSE_NODE: decrement dash timers then override velocity during active dash
    if (this.player.shipType === 'PULSE_NODE') {
      this.dashCooldown = Math.max(0, this.dashCooldown - dt);
      if (this.dashDuration > 0) {
        this.dashDuration -= dt;
        if (this.dashDuration <= 0) {
          this.dashInvuln = false;
          this.dashSquish = 0;
        } else {
          this.dashSquish = Math.max(0, this.dashSquish - dt / this.DASH_MAX_DURATION);
          this.player.vel.x = this.dashVel.x;
          this.player.vel.y = this.dashVel.y;
        }
      }
    }

    this.player.pos.x += this.player.vel.x;
    this.player.pos.y += this.player.vel.y;

    this.player.pos.x = Math.max(this.player.radius, Math.min(CANVAS_WIDTH - this.player.radius, this.player.pos.x));
    this.player.pos.y = Math.max(this.player.radius, Math.min(CANVAS_HEIGHT - this.player.radius, this.player.pos.y));

    // PULSE_NODE: cube spin + ghost trail during dash
    if (this.player.shipType === 'PULSE_NODE') {
      const spd = Math.sqrt(this.player.vel.x ** 2 + this.player.vel.y ** 2);
      this.cubeRotation += spd * 0.015;
      if (this.dashDuration > 0) {
        this.dashTrails.push({ pos: { x: this.player.pos.x, y: this.player.pos.y }, rot: this.cubeRotation, life: 0, maxLife: 18 });
      }
      this.dashTrails.forEach(t => t.life++);
      this.dashTrails = this.dashTrails.filter(t => t.life < t.maxLife);
    }

    // Calculate Tilt
    const targetTilt = (this.player.vel.x / (shipCfg.normalSpeed * (dt * 60) || 1)) * 0.25; // Max tilt ~15 degrees
    this.playerTilt += (targetTilt - this.playerTilt) * 0.15;

    // Add Trail — every frame when moving (JSAB-style short ghost)
    if (Math.abs(this.player.vel.x) > 0.3 || Math.abs(this.player.vel.y) > 0.3) {
      this.playerTrails.push({
        pos: { x: this.player.pos.x, y: this.player.pos.y },
        life: 0,
        maxLife: 8
      });
    }

    // Update Trails
    this.playerTrails.forEach(t => t.life++);
    this.playerTrails = this.playerTrails.filter(t => t.life < t.maxLife);

    // Velocity-driven squish/stretch (JSAB style)
    const maxNorm = shipCfg.normalSpeed;
    const vxFrac = Math.min(1, Math.abs(this.player.vel.x) / maxNorm);
    const vyFrac = Math.min(1, Math.abs(this.player.vel.y) / maxNorm);
    this.playerSquish.x += (1 + vxFrac * 0.3 - vyFrac * 0.1 - this.playerSquish.x) * 0.22;
    this.playerSquish.y += (1 + vyFrac * 0.3 - vxFrac * 0.1 - this.playerSquish.y) * 0.22;

    // VOTIVE_ORB: advance orbital particle angle (faster when moving)
    if (this.player.shipType === 'VOTIVE_ORB') {
      const moveSpd = Math.hypot(this.player.vel.x, this.player.vel.y);
      this.votiveOrbAngle += (2.5 + moveSpd * 0.28) * dt;
    }

    // VOID_SPIRE: rotate triangle to face movement direction
    if (this.player.shipType === 'VOID_SPIRE') {
      const spd = Math.hypot(this.player.vel.x, this.player.vel.y);
      if (spd > 0.3) {
        const targetAngle = Math.atan2(this.player.vel.y, this.player.vel.x) + Math.PI / 2;
        let da = targetAngle - this.voidSpireAngle;
        while (da > Math.PI) da -= TAU;
        while (da < -Math.PI) da += TAU;
        this.voidSpireAngle += da * 0.12;
      }
    }

    // Shooting (Auto-fire)
    this.shoot();

    // Regenerate special meter slowly
    this.player.specialMeter = Math.min(this.player.maxSpecialMeter, this.player.specialMeter + dt * 5);

    // Spell Card Announce Freeze — freeze world but allow player movement
    const frozen = this.spellAnnounceFreezeTimer > 0;
    if (frozen) this.spellAnnounceFreezeTimer = Math.max(0, this.spellAnnounceFreezeTimer - dt);

    // Update bullets
    this.bullets.forEach((b) => {
      if (frozen) return;
      // SPELL_MIRAGE reversal: bullets aimed inward pause, then scatter outward
      if (b.reverseAt && Date.now() >= b.reverseAt) {
        const outA = Math.atan2(b.vel.y, b.vel.x) + Math.PI;
        const spd = Math.hypot(b.vel.x, b.vel.y) * 1.2 + 1.5;
        b.vel.x = Math.cos(outA + (Math.random() - 0.5) * 0.6) * spd;
        b.vel.y = Math.sin(outA + (Math.random() - 0.5) * 0.6) * spd;
        b.reverseAt = undefined;
        b.color = '#FF0066';
      }
      if (b.angularVelocity) {
        const a = Math.atan2(b.vel.y, b.vel.x) + b.angularVelocity * (dt * 60);
        const spd = Math.hypot(b.vel.x, b.vel.y);
        b.vel.x = Math.cos(a) * spd;
        b.vel.y = Math.sin(a) * spd;
      }
      b.pos.x += b.vel.x * (dt * 60);
      b.pos.y += b.vel.y * (dt * 60);
    });
    if (!frozen) this.bullets = this.bullets.filter((b) => b.pos.y > -50 && b.pos.y < CANVAS_HEIGHT + 50 && b.pos.x > -50 && b.pos.x < CANVAS_WIDTH + 50);

    // Update enemies
    this.enemies.forEach((e) => {
      if (frozen) return;
      e.pos.x += e.vel.x * (dt * 60);
      e.pos.y += e.vel.y * (dt * 60);

      const isBoss = this.isBossEnemy(e);

      if (!isBoss) {
        if (e.formation === 'SNAKE') {
          // Chain of enemies sweeping from one side — each oscillates with a phase offset creating a snake curve
          e.formationTimer = (e.formationTimer || 0) + dt;
          e.vel.y = Math.sin(e.formationTimer * 2.5 - (e.formationIndex || 0) * 0.55) * 3.5;
          if ((e.vel.x > 0 && e.pos.x > CANVAS_WIDTH + e.radius + 50) ||
              (e.vel.x < 0 && e.pos.x < -e.radius - 50)) {
            e.health = 0;
          }
        } else if (e.formation === 'RICOCHET') {
          // Breakout-style wall bouncer — reflects off screen edges and upper half
          e.formationTimer = (e.formationTimer || 0) + dt;
          if (e.pos.x < e.radius + 20) e.vel.x = Math.abs(e.vel.x);
          if (e.pos.x > CANVAS_WIDTH - e.radius - 20) e.vel.x = -Math.abs(e.vel.x);
          if (e.pos.y < e.radius + 20) e.vel.y = Math.abs(e.vel.y);
          if (e.pos.y > CANVAS_HEIGHT * 0.58) e.vel.y = -Math.abs(e.vel.y);
          if ((e.formationTimer || 0) > 9) e.health = 0;
        } else if (e.formation === 'GRID_WEAVE') {
          // 3x3 grid: each column orbits 120° out of phase — pinwheel optical illusion
          e.formationTimer = (e.formationTimer || 0) + dt;
          if (e.phase === 0) {
            if (e.targetY && e.pos.y >= e.targetY) { e.vel.y = 0; e.phase = 1; }
          } else if (e.phase === 1) {
            const col = (e.formationIndex || 0) % 3;
            const row = Math.floor((e.formationIndex || 0) / 3);
            const φ = col * (TAU / 3) + row * (Math.PI / 6);
            const ω = 1.6;
            e.vel.x = Math.cos(e.formationTimer * ω + φ) * 1.8;
            e.vel.y = Math.sin(e.formationTimer * ω + φ) * 1.8;
            e.phaseTimer = (e.phaseTimer || 7) - dt;
            if ((e.phaseTimer || 0) <= 0) { e.phase = 2; e.vel.y = ENEMY_SPEED * 1.5; e.vel.x = 0; }
          }
          if (e.pos.y > CANVAS_HEIGHT + 120) e.health = 0;
        } else if (e.type === 'STRIKER') {
          if (e.phase === 0) {
            // Drift down, soft wall bounce
            if (e.pos.x < e.radius || e.pos.x > CANVAS_WIDTH - e.radius) e.vel.x *= -1;
            if (e.targetY && e.pos.y >= e.targetY) {
              e.vel.y *= 0.85;
              if (Math.abs(e.vel.y) < 0.1) {
                e.vel.y = 0;
                e.phase = 1;
              }
            }
          } else if (e.phase === 1) {
            // Hover — slow horizontal drift, then exit after phaseTimer runs out
            if (e.pos.x < e.radius + 50 || e.pos.x > CANVAS_WIDTH - e.radius - 50) e.vel.x *= -1;
            e.phaseTimer = (e.phaseTimer || 3) - dt;
            e.moveTimer = (e.moveTimer || 1) - dt;
            if ((e.moveTimer || 0) <= 0) {
              e.vel.x = (Math.random() - 0.5) * 3;
              e.moveTimer = 1 + Math.random() * 1.5;
            }
            if ((e.phaseTimer || 0) <= 0) {
              e.phase = 2;
              e.vel.y = ENEMY_SPEED * 2;
            }
          }
          // Phase 2: falls off screen naturally
        } else if (e.type === 'VOLT') {
          // Sinusoidal sweep across the screen from one side to the other
          // PINCER VOLTs skip Y oscillation so the converging lines stay crisp
          if (e.formation !== 'PINCER') {
            e.angle = (e.angle || 0) + 0.06 * (dt * 60);
            e.vel.y = Math.sin(e.angle) * 2;
          }
          if ((e.sweepDir === 1 && e.pos.x > CANVAS_WIDTH + e.radius + 50) ||
              (e.sweepDir === -1 && e.pos.x < -e.radius - 50)) {
            e.health = 0;
          }
        } else if (e.type === 'BASTION') {
          if (e.phase === 0) {
            // Slow descent with wide sinusoidal X drift
            e.angle = (e.angle || 0) + 0.025 * (dt * 60);
            e.vel.x = Math.sin(e.angle) * 2.5;
            if (e.pos.x < e.radius + 40 || e.pos.x > CANVAS_WIDTH - e.radius - 40) e.vel.x *= -1;
            if (e.targetY && e.pos.y >= e.targetY) {
              e.vel.y = 0;
              e.phase = 1;
            }
          } else if (e.phase === 1) {
            // Hover with gentle oscillation, fire radial rings
            e.angle = (e.angle || 0) + 0.02 * (dt * 60);
            e.vel.x = Math.sin(e.angle) * 1.5;
            e.phaseTimer = (e.phaseTimer || 5) - dt;
            if ((e.phaseTimer || 0) <= 0) {
              e.phase = 2;
              e.vel.y = ENEMY_SPEED * 1.5;
            }
          }
          // Phase 2: exits downward
        }

        if (e.pos.y > CANVAS_HEIGHT + 120) e.health = 0;
      } else {
        // Boss movement: Touhou-style entry descent then smooth target-based wandering
        if (e.pos.y < 180) {
          e.vel.x = 0;
          e.vel.y = 2.5;
        } else {
          this.bossMoveTimer -= dt;
          if (this.bossMoveTimer <= 0) {
            const margin = e.radius + 120;
            this.bossTarget = {
              x: margin + Math.random() * (CANVAS_WIDTH - margin * 2),
              y: 120 + Math.random() * 260,
            };
            this.bossMoveTimer = 2.5 + Math.random() * 1.5;
          }
          const dx = this.bossTarget.x - e.pos.x;
          const dy = this.bossTarget.y - e.pos.y;
          const dist = Math.hypot(dx, dy);
          const bossSpeed = e.type === 'ACT_BOSS' ? 2.0 : e.type === 'BOSS' ? 2.5 : 3.0;
          if (dist > 8) {
            e.vel.x = (dx / dist) * bossSpeed;
            e.vel.y = (dy / dist) * bossSpeed;
          } else {
            e.vel.x = 0;
            e.vel.y = 0;
          }
        }
      }

      // Enemy firing
      const now = Date.now();
      if (now - (e.lastFired || 0) > (e.fireRate || 2000)) {
        this.enemyShoot(e);
        e.lastFired = now;
      }
    });

    // Wave-based spawning for normal stages (Touhou-style groups with gaps)
    const maxEnemies = stage.enemyCount * DIFFICULTY_SETTINGS[this.difficulty].enemyCountMultiplier;
    if (!frozen && stage.type === 'NORMAL' && this.enemiesSpawned < maxEnemies) {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0 && this.enemies.length < 10) {
        const remaining = maxEnemies - this.enemiesSpawned;
        if (remaining >= 4 && Math.random() < 0.45) {
          const fTypes: Array<'SNAKE' | 'V_DIVE' | 'PINCER' | 'GRID_WEAVE' | 'RICOCHET'> = ['SNAKE', 'V_DIVE', 'PINCER', 'GRID_WEAVE', 'RICOCHET'];
          this.spawnFormation(fTypes[Math.floor(Math.random() * fTypes.length)], maxEnemies);
        } else {
          const waveSize = Math.min(Math.round(4 + Math.random() * 2), remaining);
          for (let i = 0; i < waveSize; i++) this.spawnEnemy();
        }
        this.waveTimer = 7 + Math.random() * 4;
      }
    }

    // Boss phase transition
    if (this.phaseTransitionTimer > 0) {
      this.phaseTransitionTimer -= dt;
      if (this.phaseTransitionTimer <= 0) {
        const nextPhase = this.bossPhases[this.currentBossPhaseIdx];
        if (nextPhase) {
          const hpMult = DIFFICULTY_SETTINGS[this.difficulty].bossHealthMultiplier;
          const boss = this.enemies.find(e => this.isBossEnemy(e));
          if (boss) {
            boss.health = nextPhase.hp * hpMult;
            boss.maxHealth = nextPhase.hp * hpMult;
            boss.pattern = nextPhase.pattern;
            boss.lastFired = Date.now() + 1500;
            // Spawn phase gimmicks
            this.gimmicks = [];
            const gNow = Date.now();
            if (nextPhase.type === 'SPECIAL' && (boss.type === 'BOSS' || boss.type === 'MINIBOSS')) {
              this.gimmicks.push(
                { id: `turret-L-${gNow}`, type: 'CORNER_TURRET', pos: { x: 80, y: 100 }, lastFired: gNow },
                { id: `turret-R-${gNow}`, type: 'CORNER_TURRET', pos: { x: CANVAS_WIDTH - 80, y: 100 }, lastFired: gNow }
              );
            } else if (boss.type === 'ACT_BOSS') {
              if (['SPELL_GALAXY', 'SPELL_VORTEX', 'SPELL_STORM'].includes(nextPhase.pattern)) {
                const rotSpeeds: Record<string, number> = { SPELL_GALAXY: 0.7, SPELL_VORTEX: 1.4, SPELL_STORM: 1.0 };
                const armCounts: Record<string, number> = { SPELL_GALAXY: 4, SPELL_VORTEX: 3, SPELL_STORM: 3 };
                this.gimmicks.push({
                  id: `saw-${gNow}`,
                  type: 'SAW_ARMS',
                  angle: 0,
                  rotSpeed: rotSpeeds[nextPhase.pattern] || 1.0,
                  armCount: armCounts[nextPhase.pattern] || 3,
                  armLength: 360,
                });
              } else if (['SPELL_BUTTERFLY', 'SPELL_LASER_CROSS', 'SPELL_WALLS'].includes(nextPhase.pattern)) {
                this.gimmicks.push({
                  id: `compress-${gNow}`,
                  type: 'ARENA_COMPRESS',
                  wallLeft: 0,
                  wallRight: CANVAS_WIDTH,
                  compressPhase: 'CLOSING',
                  timer: 0,
                });
              }
            }
          }
          this.bossFireAngle = 0;
          this.bullets = this.bullets.filter(b => b.owner !== 'ENEMY');
          const isSpecial = nextPhase.type === 'SPECIAL';
          if (isSpecial) {
            // Spell Card Announce Freeze: pause world for 1.5s, big title overlay
            this.spellAnnounceFreezeTimer = 1.5;
          } else {
            this.phaseNotif = {
              text: `PHASE ${this.currentBossPhaseIdx + 1}`,
              life: 2.5,
              maxLife: 2.5,
            };
          }
        }
      }
    }

    // Decay phase notification
    if (this.phaseNotif) {
      this.phaseNotif.life -= dt;
      if (this.phaseNotif.life <= 0) this.phaseNotif = null;
    }

    // Gimmick update (skipped during spell announce freeze)
    if (!frozen) {
    this.gimmickHitTimer = Math.max(0, this.gimmickHitTimer - dt);
    const bossRef = this.enemies.find(e => this.isBossEnemy(e));
    this.gimmicks.forEach(g => {
      if (g.type === 'CORNER_TURRET') {
        const tNow = Date.now();
        const fireInterval = Math.max(160, 260 - DIFFICULTY_SETTINGS[this.difficulty].multiplier * 30);
        if (tNow - (g.lastFired || 0) > fireInterval) {
          g.lastFired = tNow;
          const angle = Math.atan2(this.player.pos.y - g.pos!.y, this.player.pos.x - g.pos!.x);
          this.bullets.push({
            id: `turret-${tNow}-${g.id}`,
            pos: { x: g.pos!.x, y: g.pos!.y },
            vel: { x: Math.cos(angle) * 4.5, y: Math.sin(angle) * 4.5 },
            radius: 5, health: 1, maxHealth: 1,
            owner: 'ENEMY', damage: 10, color: '#FF3300',
          });
        }
      } else if (g.type === 'LASER_SWEEP') {
        g.timer = (g.timer || 0) - dt;
        if (g.sweepPhase === 'WARN' && (g.timer || 0) <= 0) {
          g.sweepPhase = 'FIRE';
          g.timer = 0.38;
        } else if (g.sweepPhase === 'FIRE') {
          if ((g.timer || 0) <= 0) {
            g.sweepPhase = 'DONE';
          } else if (this.gimmickHitTimer <= 0 && Math.abs(this.player.pos.y - g.y!) < 35 + HITBOX_RADIUS) {
            this.takeDamage(18);
            this.gimmickHitTimer = 0.4;
          }
        }
      } else if (g.type === 'SAW_ARMS' && bossRef) {
        g.angle = (g.angle || 0) + (g.rotSpeed || 1.0) * dt;
        if (this.gimmickHitTimer <= 0) {
          const armLen = g.armLength || 360;
          const armCnt = g.armCount || 3;
          for (let a = 0; a < armCnt; a++) {
            const armAngle = g.angle! + a * (TAU / armCnt);
            const tip = { x: bossRef.pos.x + Math.cos(armAngle) * armLen, y: bossRef.pos.y + Math.sin(armAngle) * armLen };
            if (this.distPointToSegment(this.player.pos, bossRef.pos, tip) < 16 + HITBOX_RADIUS) {
              this.takeDamage(22);
              this.gimmickHitTimer = 0.6;
              break;
            }
          }
        }
      } else if (g.type === 'ARENA_COMPRESS') {
        if (g.compressPhase === 'CLOSING') {
          g.wallLeft = Math.min((g.wallLeft || 0) + 38 * dt, CANVAS_WIDTH * 0.22);
          g.wallRight = Math.max((g.wallRight || CANVAS_WIDTH) - 38 * dt, CANVAS_WIDTH * 0.78);
          if ((g.wallLeft || 0) >= CANVAS_WIDTH * 0.22) { g.compressPhase = 'HOLD'; g.timer = 4.5; }
        } else if (g.compressPhase === 'HOLD') {
          g.timer = (g.timer || 0) - dt;
          if ((g.timer || 0) <= 0) g.compressPhase = 'OPENING';
        } else if (g.compressPhase === 'OPENING') {
          g.wallLeft = Math.max((g.wallLeft || 0) - 55 * dt, 0);
          g.wallRight = Math.min((g.wallRight || CANVAS_WIDTH) + 55 * dt, CANVAS_WIDTH);
          if ((g.wallLeft || 0) <= 0) g.compressPhase = 'CLOSING';
        }
        this.player.pos.x = Math.max(
          (g.wallLeft || 0) + this.player.radius + 4,
          Math.min((g.wallRight || CANVAS_WIDTH) - this.player.radius - 4, this.player.pos.x)
        );
      }
    });
    this.gimmicks = this.gimmicks.filter(g => g.sweepPhase !== 'DONE');
    } // end !frozen gimmick block

    this.checkCollisions();

    // Update effects
    this.effects.forEach(f => f.life -= dt);
    this.effects = this.effects.filter(f => f.life > 0);

    // Update death particles
    this.particles.forEach(p => {
      p.pos.x += p.vel.x * (dt * 60);
      p.pos.y += p.vel.y * (dt * 60);
      p.vel.x *= 0.92;
      p.vel.y *= 0.92;
      p.life -= dt;
    });
    this.particles = this.particles.filter(p => p.life > 0);

    this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);

    // Screen shake decay
    this.screenShakeTrauma = Math.max(0, this.screenShakeTrauma - dt * 2.2);
    const shakeMag = this.screenShakeTrauma * this.screenShakeTrauma * 22;
    this.screenShakeOffset.x = (Math.random() * 2 - 1) * shakeMag;
    this.screenShakeOffset.y = (Math.random() * 2 - 1) * shakeMag;
    this.bossHitFlash = Math.max(0, this.bossHitFlash - dt * 8);
    if (this.bgPulse) {
      this.bgPulse.life = Math.max(0, this.bgPulse.life - dt);
      if (this.bgPulse.life <= 0) this.bgPulse = null;
    }

    // Graze streak + flash decay
    if (this.grazeStreakTimer > 0) {
      this.grazeStreakTimer = Math.max(0, this.grazeStreakTimer - dt);
      if (this.grazeStreakTimer <= 0) this.grazeStreak = 0;
    }
    this.grazeFlashes.forEach(f => { f.life -= dt; });
    this.grazeFlashes = this.grazeFlashes.filter(f => f.life > 0);

    // VOID Stack decay
    if (this.voidStackTimer > 0) {
      this.voidStackTimer = Math.max(0, this.voidStackTimer - dt);
      if (this.voidStackTimer <= 0) this.voidStacks = 0;
    }

    // DEPTH_SCROLL: advance parallax offset during boss fights
    if (STAGES[this.currentStageIndex].type !== 'NORMAL') {
      this.depthScrollY = (this.depthScrollY + 50 * dt) % 64;
    }

    // Void Convert visual decay
    this.voidConvertRings.forEach(r => { r.life -= dt; });
    this.voidConvertRings = this.voidConvertRings.filter(r => r.life > 0);
    this.voidAbsorbFlashes.forEach(f => { f.life -= dt; });
    this.voidAbsorbFlashes = this.voidAbsorbFlashes.filter(f => f.life > 0);
    if (this.voidCenterFlash) {
      this.voidCenterFlash.life -= dt;
      if (this.voidCenterFlash.life <= 0) this.voidCenterFlash = null;
    }

    // Check stage completion
    if (this.enemies.length === 0 && this.enemiesSpawned >= maxEnemies) {
      this.completeStage();
    }

    this.onUpdate({ ...this.player });
  }

  private triggerDash() {
    if (this.dashCooldown > 0 || this.dashDuration > 0) return;

    const mx = (this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0) - (this.keys['KeyA'] || this.keys['ArrowLeft'] ? 1 : 0);
    const my = (this.keys['KeyS'] || this.keys['ArrowDown'] ? 1 : 0) - (this.keys['KeyW'] || this.keys['ArrowUp'] ? 1 : 0);
    let dx = mx, dy = my;
    if (dx === 0 && dy === 0) { dy = -1; }
    const len = Math.sqrt(dx * dx + dy * dy);
    this.dashVel = { x: (dx / len) * 18, y: (dy / len) * 18 };
    this.dashDuration = this.DASH_MAX_DURATION;
    this.dashCooldown = this.DASH_MAX_COOLDOWN;
    this.dashInvuln = true;
    this.dashSquish = 1.0;
    audioService.playDash();

    // Powered dash: consume special meter for a shockwave burst on departure
    if (this.player.specialMeter >= SPECIAL_COST) {
      this.player.specialMeter -= SPECIAL_COST;
      this.effects.push({ type: 'SQUARE', pos: { ...this.player.pos }, radius: 240, life: 0.4, maxLife: 0.4 });
      this.bullets = this.bullets.filter(b => {
        if (b.owner !== 'ENEMY') return true;
        return !(Math.abs(b.pos.x - this.player.pos.x) < 240 && Math.abs(b.pos.y - this.player.pos.y) < 240);
      });
      this.enemies.forEach(e => {
        const isBoss = this.isBossEnemy(e);
        if (Math.abs(e.pos.x - this.player.pos.x) < 240 && Math.abs(e.pos.y - this.player.pos.y) < 240) {
          if (this.phaseTransitionTimer <= 0) {
            e.health -= 350;
            if (isBoss && e.health <= 0) { e.health = 1; this.advanceBossPhase(e); }
          }
        }
      });
      audioService.playSound('bomb');
    }
  }

  private switchFireMode() {
    this.player.fireMode = this.player.fireMode === 'PRIMARY' ? 'ALTERNATE' : 'PRIMARY';
    audioService.playModeSwitch();
  }

  private shoot() {
    const now = Date.now();
    const shipCfg = SHIP_SETTINGS[this.player.shipType];
    const fireInterval = this.player.fireMode === 'PRIMARY' ? shipCfg.primaryFireRate : shipCfg.altFireRate;

    if (now - this.lastShot < fireInterval) return;
    this.lastShot = now;
    audioService.playSound('shoot');

    const bulletSpeed = shipCfg.bulletSpeed;

    if (this.player.shipType === 'VOTIVE_ORB') {
      if (this.player.fireMode === 'PRIMARY') {
        // Forward stream of small circular shots
        this.bullets.push({
          id: `p-bullet-${now}-1`,
          pos: { x: this.player.pos.x - 5, y: this.player.pos.y - 10 },
          vel: { x: 0, y: -bulletSpeed },
          radius: BULLET_RADIUS,
          health: 1,
          maxHealth: 1,
          owner: 'PLAYER',
          damage: 10,
          color: '#000000',
        });
        this.bullets.push({
          id: `p-bullet-${now}-2`,
          pos: { x: this.player.pos.x + 5, y: this.player.pos.y - 10 },
          vel: { x: 0, y: -bulletSpeed },
          radius: BULLET_RADIUS,
          health: 1,
          maxHealth: 1,
          owner: 'PLAYER',
          damage: 10,
          color: '#000000',
        });
      } else {
        // Tight concentrated forward stream
        this.bullets.push({
          id: `p-bullet-${now}`,
          pos: { x: this.player.pos.x, y: this.player.pos.y - 15 },
          vel: { x: 0, y: -bulletSpeed * 1.2 },
          radius: BULLET_RADIUS * 0.8,
          health: 1,
          maxHealth: 1,
          owner: 'PLAYER',
          damage: 25,
          color: '#000000',
        });
      }
    } else if (this.player.shipType === 'PULSE_NODE') {
      if (this.player.fireMode === 'PRIMARY') {
        // Forward pulse bursts (chunky)
        this.bullets.push({
          id: `p-bullet-${now}`,
          pos: { x: this.player.pos.x, y: this.player.pos.y - 10 },
          vel: { x: 0, y: -bulletSpeed },
          radius: BULLET_RADIUS * 1.5,
          health: 1,
          maxHealth: 1,
          owner: 'PLAYER',
          damage: 20,
          color: '#333333',
        });
      } else {
        // Narrow pulse line
        this.bullets.push({
          id: `p-bullet-${now}`,
          pos: { x: this.player.pos.x, y: this.player.pos.y - 10 },
          vel: { x: 0, y: -bulletSpeed * 1.5 },
          radius: BULLET_RADIUS * 0.5,
          health: 1,
          maxHealth: 1,
          owner: 'PLAYER',
          damage: 15,
          color: '#666666',
        });
      }
    } else if (this.player.shipType === 'VOID_SPIRE') {
      if (this.player.fireMode === 'PRIMARY') {
        // 3-way triangular shard spread
        for (let i = -1; i <= 1; i++) {
          this.bullets.push({
            id: `p-bullet-${now}-${i}`,
            pos: { x: this.player.pos.x, y: this.player.pos.y - 10 },
            vel: { x: i * 2, y: -bulletSpeed },
            radius: BULLET_RADIUS,
            health: 1,
            maxHealth: 1,
            owner: 'PLAYER',
            damage: 12,
            color: '#FF00FF',
          });
        }
      } else {
        // Narrow piercing tri-lance
        for (let i = -1; i <= 1; i++) {
          this.bullets.push({
            id: `p-bullet-${now}-${i}`,
            pos: { x: this.player.pos.x + i * 4, y: this.player.pos.y - 15 },
            vel: { x: 0, y: -bulletSpeed * 1.3 },
            radius: BULLET_RADIUS * 0.6,
            health: 1,
            maxHealth: 1,
            owner: 'PLAYER',
            damage: 18,
            color: '#AA00AA',
          });
        }
      }
    }

    // Apply kinetic damage multiplier to bullets just fired
    if (this.kineticMult > 1) {
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        if (this.bullets[i].owner !== 'PLAYER') break;
        this.bullets[i].damage = Math.round(this.bullets[i].damage * this.kineticMult);
      }
    }

    // VOID Stack damage boost (VOID_SPIRE only — stacks from grazing)
    if (this.player.shipType === 'VOID_SPIRE' && this.voidStacks > 0) {
      const voidMult = 1 + this.voidStacks * 0.08;
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        if (this.bullets[i].owner !== 'PLAYER') break;
        this.bullets[i].damage = Math.round(this.bullets[i].damage * voidMult);
      }
    }
  }

  private enemyShoot(e: Enemy) {
    const now = Date.now();
    if (e.type === 'STRIKER') {
      // Aimed single shot
      const angle = Math.atan2(this.player.pos.y - e.pos.y, this.player.pos.x - e.pos.x);
      this.bullets.push({
        id: `e-bullet-${now}`,
        pos: { ...e.pos },
        vel: { x: Math.cos(angle) * 5, y: Math.sin(angle) * 5 },
        radius: 4,
        health: 1,
        maxHealth: 1,
        owner: 'ENEMY',
        damage: 10,
        color: '#FF0000',
      });
    } else if (e.type === 'VOLT') {
      // 3-way spread aimed at player
      const baseAngle = Math.atan2(this.player.pos.y - e.pos.y, this.player.pos.x - e.pos.x);
      for (let i = -1; i <= 1; i++) {
        const angle = baseAngle + i * 0.25;
        this.bullets.push({
          id: `e-bullet-${now}-${i}`,
          pos: { ...e.pos },
          vel: { x: Math.cos(angle) * 6, y: Math.sin(angle) * 6 },
          radius: 4,
          health: 1,
          maxHealth: 1,
          owner: 'ENEMY',
          damage: 8,
          color: '#FF8800',
        });
      }
    } else if (e.type === 'BASTION') {
      // Rotating 6-bullet radial ring
      const count = 6;
      const rotOffset = (now / 2000) * Math.PI;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * TAU + rotOffset;
        this.bullets.push({
          id: `e-bullet-${now}-${i}`,
          pos: { ...e.pos },
          vel: { x: Math.cos(angle) * 3.5, y: Math.sin(angle) * 3.5 },
          radius: 5,
          health: 1,
          maxHealth: 1,
          owner: 'ENEMY',
          damage: 12,
          color: '#4466FF',
        });
      }
    } else if (this.isBossEnemy(e)) {
      if (this.phaseTransitionTimer > 0 || this.spellAnnounceFreezeTimer > 0) return;
      this.bossFire(e);
    }
  }

  private bossFire(e: Enemy) {
    const now = Date.now();
    const pattern = e.pattern || 'AIMED_SPREAD';

    switch (pattern) {
      case 'AIMED_SPREAD': {
        e.fireRate = 1200;
        const base = Math.atan2(this.player.pos.y - e.pos.y, this.player.pos.x - e.pos.x);
        for (let i = -2; i <= 2; i++) {
          const a = base + i * 0.22;
          this.bullets.push({ id: `b-${now}-${i}`, pos: { ...e.pos }, vel: { x: Math.cos(a) * 4.5, y: Math.sin(a) * 4.5 }, radius: 5, health: 1, maxHealth: 1, owner: 'ENEMY', damage: 12, color: '#CC3333' });
        }
        break;
      }
      case 'ROTATING_RING': {
        e.fireRate = 700;
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU + this.bossFireAngle;
          this.bullets.push({ id: `b-${now}-${i}`, pos: { ...e.pos }, vel: { x: Math.cos(a) * 3.5, y: Math.sin(a) * 3.5 }, radius: 5, health: 1, maxHealth: 1, owner: 'ENEMY', damage: 10, color: '#3355CC' });
        }
        this.bossFireAngle += Math.PI / 10;
        break;
      }
      case 'CROSS_AIMED': {
        e.fireRate = 1400;
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2 + this.bossFireAngle;
          this.bullets.push({ id: `b-${now}-c${i}`, pos: { ...e.pos }, vel: { x: Math.cos(a) * 3.2, y: Math.sin(a) * 3.2 }, radius: 6, health: 1, maxHealth: 1, owner: 'ENEMY', damage: 14, color: '#CC5533' });
        }
        const aim = Math.atan2(this.player.pos.y - e.pos.y, this.player.pos.x - e.pos.x);
        for (let i = -1; i <= 1; i++) {
          this.bullets.push({ id: `b-${now}-a${i}`, pos: { ...e.pos }, vel: { x: Math.cos(aim + i * 0.2) * 5, y: Math.sin(aim + i * 0.2) * 5 }, radius: 4, health: 1, maxHealth: 1, owner: 'ENEMY', damage: 12, color: '#FF5533' });
        }
        this.bossFireAngle += Math.PI / 8;
        if (e.type === 'BOSS' && !this.gimmicks.some(g => g.type === 'LASER_SWEEP')) {
          this.gimmicks.push({
            id: `laser-${now}`,
            type: 'LASER_SWEEP',
            y: 360 + Math.random() * (CANVAS_HEIGHT * 0.42),
            sweepPhase: 'WARN',
            timer: 0.75,
          });
        }
        break;
      }
      case 'DENSE_AIMED': {
        e.fireRate = 260;
        const a = Math.atan2(this.player.pos.y - e.pos.y, this.player.pos.x - e.pos.x) + (Math.random() - 0.5) * 0.15;
        this.bullets.push({ id: `b-${now}`, pos: { ...e.pos }, vel: { x: Math.cos(a) * 7, y: Math.sin(a) * 7 }, radius: 4, health: 1, maxHealth: 1, owner: 'ENEMY', damage: 10, color: '#FF2222' });
        break;
      }
      case 'ALL_OUT': {
        e.fireRate = 550;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU + this.bossFireAngle;
          this.bullets.push({ id: `b-${now}-r${i}`, pos: { ...e.pos }, vel: { x: Math.cos(a) * 4, y: Math.sin(a) * 4 }, radius: 5, health: 1, maxHealth: 1, owner: 'ENEMY', damage: 11, color: '#FF3311' });
        }
        const aA = Math.atan2(this.player.pos.y - e.pos.y, this.player.pos.x - e.pos.x);
        this.bullets.push({ id: `b-${now}-aimed`, pos: { ...e.pos }, vel: { x: Math.cos(aA) * 6.5, y: Math.sin(aA) * 6.5 }, radius: 5, health: 1, maxHealth: 1, owner: 'ENEMY', damage: 14, color: '#FF6611' });
        this.bossFireAngle += Math.PI / 16;
        break;
      }
      case 'SPELL_SPIRAL': {
        e.fireRate = 100;
        for (let arm = 0; arm < 3; arm++) {
          const a = this.bossFireAngle + arm * (TAU / 3);
          this.bullets.push({ id: `b-${now}-sp${arm}`, pos: { ...e.pos }, vel: { x: Math.cos(a) * 2.8, y: Math.sin(a) * 2.8 }, radius: 5, health: 1, maxHealth: 1, owner: 'ENEMY', damage: 8, color: '#FF00AA', angularVelocity: 0.018 });
        }
        this.bossFireAngle += 0.35;
        break;
      }
      case 'SPELL_WALLS': {
        e.fireRate = 360;
        const gapIdx = Math.floor(Math.random() * 6);
        const spacing = CANVAS_WIDTH / 6;
        for (let i = 0; i < 6; i++) {
          if (i === gapIdx) continue;
          this.bullets.push({ id: `b-${now}-w${i}`, pos: { x: spacing * i + spacing / 2, y: 80 }, vel: { x: 0, y: 3.5 }, radius: 20, health: 1, maxHealth: 1, owner: 'ENEMY', damage: 12, color: '#7700FF' });
        }
        break;
      }
      case 'SPELL_FLOWER': {
        e.fireRate = 550;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + this.bossFireAngle;
          for (let j = -1; j <= 1; j++) {
            this.bullets.push({ id: `b-${now}-f${i}${j}`, pos: { ...e.pos }, vel: { x: Math.cos(a + j * 0.2) * 3.5, y: Math.sin(a + j * 0.2) * 3.5 }, radius: 5, health: 1, maxHealth: 1, owner: 'ENEMY', damage: 10, color: '#FF44AA' });
          }
        }
        this.bossFireAngle += Math.PI / 6;
        break;
      }
      case 'SPELL_LASER_CROSS': {
        e.fireRate = 80;
        for (let i = 0; i < 4; i++) {
          const a = this.bossFireAngle + i * (Math.PI / 2);
          this.bullets.push({ id: `b-${now}-lc${i}`, pos: { ...e.pos }, vel: { x: Math.cos(a) * 5.5, y: Math.sin(a) * 5.5 }, radius: 3, health: 1, maxHealth: 1, owner: 'ENEMY', damage: 8, color: '#00FFAA' });
        }
        this.bossFireAngle += 0.08;
        break;
      }
      case 'SPELL_VORTEX': {
        e.fireRate = 120;
        const blend = this.bossFireAngle + Math.sin(Date.now() / 800) * 0.5;
        for (let i = 0; i < 2; i++) {
          const a = blend + i * Math.PI;
          this.bullets.push({ id: `b-${now}-v${i}`, pos: { ...e.pos }, vel: { x: Math.cos(a) * 3.2, y: Math.sin(a) * 3.2 }, radius: 6, health: 1, maxHealth: 1, owner: 'ENEMY', damage: 10, color: '#8844FF', angularVelocity: 0.03 });
        }
        this.bossFireAngle += 0.25;
        break;
      }
      case 'SPELL_STORM': {
        e.fireRate = 180;
        const baseA = Math.atan2(this.player.pos.y - e.pos.y, this.player.pos.x - e.pos.x);
        for (let i = 0; i < 6; i++) {
          const a = baseA + (i / 6) * TAU + this.bossFireAngle * 0.5;
          this.bullets.push({ id: `b-${now}-st${i}`, pos: { ...e.pos }, vel: { x: Math.cos(a) * 4, y: Math.sin(a) * 4 }, radius: 5, health: 1, maxHealth: 1, owner: 'ENEMY', damage: 11, color: '#CC44FF' });
        }
        this.bossFireAngle += 0.4;
        break;
      }
      case 'AIMED_FAN': {
        // Tutorial fan pattern: 3 concentric speed layers × 5 angles aimed at player
        e.fireRate = 800;
        const fanBase = Math.atan2(this.player.pos.y - e.pos.y, this.player.pos.x - e.pos.x);
        const fanSpeeds = [5.0, 3.5, 2.0];
        const fanRadii = [4, 5, 7];
        const fanColors = ['#CC3333', '#FF5533', '#FF8855'];
        for (let layer = 0; layer < 3; layer++) {
          for (let i = -2; i <= 2; i++) {
            const a = fanBase + i * 0.22;
            this.bullets.push({ id: `b-${now}-fan${layer}${i}`, pos: { ...e.pos }, vel: { x: Math.cos(a) * fanSpeeds[layer], y: Math.sin(a) * fanSpeeds[layer] }, radius: fanRadii[layer], health: 1, maxHealth: 1, owner: 'ENEMY', damage: 10 + layer * 2, color: fanColors[layer] });
          }
        }
        break;
      }
      case 'SPELL_BUTTERFLY': {
        // Symmetric mirrored wings: 5 bullets per side fanning out from player direction
        e.fireRate = 600;
        const btBase = Math.atan2(this.player.pos.y - e.pos.y, this.player.pos.x - e.pos.x);
        for (const wing of [-1, 1]) {
          for (let j = 0; j < 5; j++) {
            const a = btBase + wing * (0.1 + j * 0.18);
            const spd = 4.5 - j * 0.35;
            this.bullets.push({ id: `b-${now}-bt${wing}${j}`, pos: { ...e.pos }, vel: { x: Math.cos(a) * spd, y: Math.sin(a) * spd }, radius: 5, health: 1, maxHealth: 1, owner: 'ENEMY', damage: 10, color: '#FF44DD' });
          }
        }
        this.bossFireAngle += Math.PI / 10;
        break;
      }
      case 'SPELL_GALAXY': {
        // 4-arm spiral: bullets have angular velocity so they curve into galaxy arcs
        e.fireRate = 200;
        for (let arm = 0; arm < 4; arm++) {
          const a = this.bossFireAngle + arm * (Math.PI / 2);
          const curl = arm % 2 === 0 ? 0.022 : -0.022;
          this.bullets.push({ id: `b-${now}-gx${arm}`, pos: { ...e.pos }, vel: { x: Math.cos(a) * 3.2, y: Math.sin(a) * 3.2 }, radius: 6, health: 1, maxHealth: 1, owner: 'ENEMY', damage: 12, color: '#AA44FF', angularVelocity: curl });
        }
        this.bossFireAngle += 0.18;
        break;
      }
      case 'SPELL_HYPNOSIS': {
        // Three concentric rings at differential angular velocities — inner appears to rotate backward
        e.fireRate = 600;
        const rings = [
          { count: 8,  speed: 2.5, angVel: 0.028, radius: 5, color: '#CC44FF' },
          { count: 10, speed: 3.5, angVel: 0.024, radius: 6, color: '#9922DD' },
          { count: 12, speed: 4.5, angVel: 0.020, radius: 7, color: '#6600BB' },
        ];
        rings.forEach((ring, ri) => {
          for (let i = 0; i < ring.count; i++) {
            const a = (i / ring.count) * TAU + this.bossFireAngle + ri * 0.18;
            this.bullets.push({ id: `b-${now}-hyp${ri}${i}`, pos: { ...e.pos }, vel: { x: Math.cos(a) * ring.speed, y: Math.sin(a) * ring.speed }, radius: ring.radius, health: 1, maxHealth: 1, owner: 'ENEMY', damage: 9, color: ring.color, angularVelocity: ring.angVel });
          }
        });
        this.bossFireAngle += 0.3;
        break;
      }
      case 'SPELL_HELIX': {
        // Counter-rotating dual spiral: slow CREEP arm (bait) + fast FAST arm (kill)
        e.fireRate = 100;
        const slowA = this.bossFireAngle;
        const fastA = this.bossFireAngle + Math.PI;
        // CREEP arm — large, soft pink, draws eye attention
        this.bullets.push({ id: `b-${now}-hs`, pos: { ...e.pos }, vel: { x: Math.cos(slowA) * 1.5, y: Math.sin(slowA) * 1.5 }, radius: 7, health: 1, maxHealth: 1, owner: 'ENEMY', damage: 8, color: '#FF66BB', angularVelocity: 0.025 });
        // FAST arm — small, dark, counter-rotating
        this.bullets.push({ id: `b-${now}-hf`, pos: { ...e.pos }, vel: { x: Math.cos(fastA) * 7.5, y: Math.sin(fastA) * 7.5 }, radius: 4, health: 1, maxHealth: 1, owner: 'ENEMY', damage: 14, color: '#880033', angularVelocity: -0.018 });
        this.bossFireAngle += 0.28;
        break;
      }
      case 'SPELL_MIRAGE': {
        // Bullets spawn at ring radius around boss aimed inward (safe-looking), then reverse outward
        e.fireRate = 1200;
        const mirRadius = 260;
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU + this.bossFireAngle;
          const spawnX = Math.max(30, Math.min(CANVAS_WIDTH - 30, e.pos.x + Math.cos(a) * mirRadius));
          const spawnY = Math.max(30, Math.min(CANVAS_HEIGHT - 30, e.pos.y + Math.sin(a) * mirRadius));
          const inwardA = a + Math.PI;
          this.bullets.push({ id: `b-${now}-mir${i}`, pos: { x: spawnX, y: spawnY }, vel: { x: Math.cos(inwardA) * 3.5, y: Math.sin(inwardA) * 3.5 }, radius: 6, health: 1, maxHealth: 1, owner: 'ENEMY', damage: 11, color: '#FF66AA', reverseAt: now + 800 });
        }
        this.bossFireAngle += 0.52;
        break;
      }
    }
  }

  private advanceBossPhase(boss: Enemy) {
    this.gimmicks = [];
    const currentPhase = this.bossPhases[this.currentBossPhaseIdx];
    if (currentPhase?.type === 'SPECIAL' && !this.phaseHitDuringSpecial) {
      this.grantSpellBonus();
    }
    this.currentBossPhaseIdx++;

    if (this.currentBossPhaseIdx >= this.bossPhases.length) {
      boss.health = 0;
      this.player.kills++;
      this.player.experience += boss.scoreValue;
      this.effects.push({ type: 'CIRCLE', pos: { ...boss.pos }, radius: 300, life: 0.8, maxLife: 0.8 });
      return;
    }

    this.phaseTransitionTimer = 1.8;
    this.phaseHitDuringSpecial = false;
    this.screenShakeTrauma = Math.min(1, this.screenShakeTrauma + 0.45);
    this.bgPulse = { color: '#FF0033', life: 0.5, maxLife: 0.5 };
    audioService.playBossTransition();
    this.bullets = this.bullets.filter(b => b.owner !== 'ENEMY');
    this.effects.push({ type: 'CIRCLE', pos: { ...boss.pos }, radius: 180, life: 0.5, maxLife: 0.5 });
  }

  private grantSpellBonus() {
    if (this.player.shipType === 'VOID_SPIRE') {
      this.player.health = Math.min(this.player.maxHealth, this.player.health + 40);
      this.player.integrity = Math.min(100, this.player.integrity + 15);
    } else {
      this.player.specialMeter = this.player.maxSpecialMeter;
    }
    this.effects.push({ type: 'CIRCLE', pos: { ...this.player.pos }, radius: 120, life: 0.8, maxLife: 0.8 });
    this.phaseNotif = { text: '★ SPELL BONUS ★', life: 2.5, maxLife: 2.5 };
  }

  private checkCollisions() {
    this.bullets.forEach((b) => {
      if (b.owner === 'PLAYER') {
        this.enemies.forEach((e) => {
          const dist = Math.hypot(b.pos.x - e.pos.x, b.pos.y - e.pos.y);
          if (dist < b.radius + e.radius) {
            const isBoss = this.isBossEnemy(e);
            if (isBoss && this.phaseTransitionTimer > 0) { b.health = 0; return; }

            e.health -= b.damage;
            b.health = 0;
            audioService.playSound('hit');
            if (isBoss) {
              this.bossHitFlash = 1.0;
              this.screenShakeTrauma = Math.min(1, this.screenShakeTrauma + 0.05);
            }
            if (e.health <= 0) {
              if (isBoss) {
                e.health = 1;
                this.advanceBossPhase(e);
              } else {
                this.player.kills++;
                this.player.experience += e.scoreValue;
                this.player.specialMeter = Math.min(this.player.maxSpecialMeter, this.player.specialMeter + 2);
                audioService.playExplosion();
                this.screenShakeTrauma = Math.min(1, this.screenShakeTrauma + 0.1);
                const pColor = e.type === 'VOLT' ? '#FF8800' : e.type === 'BASTION' ? '#4466FF' : '#222222';
                for (let p = 0; p < 14; p++) {
                  const pAngle = (p / 14) * TAU + Math.random() * 0.5;
                  const speed = 1.8 + Math.random() * 3.8;
                  this.particles.push({
                    pos: { x: e.pos.x, y: e.pos.y },
                    vel: { x: Math.cos(pAngle) * speed, y: Math.sin(pAngle) * speed },
                    life: 0.45 + Math.random() * 0.25,
                    maxLife: 0.45 + Math.random() * 0.25,
                    radius: 2 + Math.random() * 3,
                    color: pColor,
                  });
                }
              }
            }
          }
        });
      } else {
        // Enemy bullet vs Player
        const dist = Math.hypot(b.pos.x - this.player.pos.x, b.pos.y - this.player.pos.y);
        if (dist < b.radius + HITBOX_RADIUS) {
          this.takeDamage(b.damage);
          b.health = 0;
        }
      }
    });

    // Graze detection — enemy bullets passing near hitbox without hitting
    if (!this.dashInvuln && this.hitFlashTimer <= 0) {
      const nowGrazing = new Set<string>();
      this.bullets.forEach(b => {
        if (b.owner !== 'ENEMY') return;
        const dist = Math.hypot(b.pos.x - this.player.pos.x, b.pos.y - this.player.pos.y);
        const hitThreshold = b.radius + HITBOX_RADIUS;
        const grazeThreshold = b.radius + GRAZE_RADIUS;
        if (dist >= hitThreshold && dist < grazeThreshold) {
          nowGrazing.add(b.id);
          if (!this.grazedBulletIds.has(b.id)) {
            this.player.experience += 3;
            this.player.specialMeter = Math.min(this.player.maxSpecialMeter, this.player.specialMeter + 2);
            this.grazeStreak++;
            this.grazeStreakTimer = 1.8;
            if (this.player.shipType === 'VOID_SPIRE') {
              this.voidStacks = Math.min(5, this.voidStacks + 1);
              this.voidStackTimer = 2.0;
            }
            this.grazeFlashes.push({ pos: { ...this.player.pos }, life: 0.22, maxLife: 0.22 });
            const now = Date.now();
            if (now - this.grazeAudioThrottle > 70) {
              this.grazeAudioThrottle = now;
              audioService.playGraze();
            }
          }
        }
      });
      this.grazedBulletIds = nowGrazing;
    }

    // Player vs Enemy collision
    this.enemies.forEach((e) => {
      const dist = Math.hypot(e.pos.x - this.player.pos.x, e.pos.y - this.player.pos.y);
      if (dist < e.radius + HITBOX_RADIUS) {
        const isBoss = this.isBossEnemy(e);
        this.takeDamage(isBoss ? 30 : 20);
        if (!isBoss) e.health -= 50;
      }
    });

    this.enemies = this.enemies.filter((e) => e.health > 0);
    this.bullets = this.bullets.filter((b) => b.health > 0);
    
    this.player.level = this.currentStageIndex + 1;
  }

  private takeDamage(amount: number) {
    if (this.player.health <= 0) return;
    if (this.dashInvuln) return;
    const curPhase = this.bossPhases[this.currentBossPhaseIdx];
    if (curPhase?.type === 'SPECIAL') this.phaseHitDuringSpecial = true;

    this.player.health -= amount;
    this.player.damageTaken += amount;
    this.player.integrity = Math.max(0, this.player.integrity - 5);
    this.hitFlashTimer = 0.28;
    this.screenShakeTrauma = Math.min(1, this.screenShakeTrauma + 0.65);
    audioService.playPlayerDamage();

    if (this.player.health <= 0) {
      if (this.player.specialMeter >= 50) {
        // Auto-special (Deathbomb)
        this.player.health = 20;
        this.useSpecial();
      } else {
        audioService.playGameOver();
        this.setState('GAME_OVER');
      }
    }
  }

  private useSpecial() {
    if (this.player.specialMeter < SPECIAL_COST) return;
    
    this.player.specialMeter -= SPECIAL_COST;
    audioService.playBomb();
    this.screenShakeTrauma = Math.min(1, this.screenShakeTrauma + 0.4);

    const shipCfg = SHIP_SETTINGS[this.player.shipType];

    if (shipCfg.specialType === 'CIRCLE_BOMB') {
      this.effects.push({ type: 'CIRCLE', pos: { ...this.player.pos }, radius: 400, life: 0.5, maxLife: 0.5 });
      // Clear all enemy bullets
      this.bullets = this.bullets.filter(b => b.owner === 'PLAYER');
      
      // Damage all enemies and clear non-bosses
      this.enemies.forEach(e => {
        const isBoss = this.isBossEnemy(e);
        if (isBoss) {
          if (this.phaseTransitionTimer <= 0) {
            e.health -= 500;
            if (e.health <= 0) { e.health = 1; this.advanceBossPhase(e); }
          }
        } else {
          e.health = 0;
          this.player.kills++;
          this.player.experience += e.scoreValue;
        }
      });
    } else if (shipCfg.specialType === 'SHOCK_PULSE') {
      this.effects.push({ type: 'SQUARE', pos: { ...this.player.pos }, radius: 300, life: 0.5, maxLife: 0.5 });
      // Shock Pulse: Clears bullets in a structured shape (square wave field)
      this.bullets = this.bullets.filter(b => {
        if (b.owner === 'ENEMY') {
          const dx = Math.abs(b.pos.x - this.player.pos.x);
          const dy = Math.abs(b.pos.y - this.player.pos.y);
          // Square clear area
          if (dx < 300 && dy < 300) return false;
        }
        return true;
      });
      this.enemies.forEach(e => {
        const dx = Math.abs(e.pos.x - this.player.pos.x);
        const dy = Math.abs(e.pos.y - this.player.pos.y);
        const isBoss = this.isBossEnemy(e);
        if (dx < 300 && dy < 300) {
          if (this.phaseTransitionTimer <= 0) {
            e.health -= 400;
            if (isBoss && e.health <= 0) { e.health = 1; this.advanceBossPhase(e); }
          }
        }
      });
    } else if (shipCfg.specialType === 'DISTORTION_PULSE') {
      // Void Convert: absorb nearby enemy bullets and fire them back
      const absorbRadius = 380;
      const absorbed: Bullet[] = [];
      this.bullets = this.bullets.filter(b => {
        if (b.owner === 'ENEMY' && Math.hypot(b.pos.x - this.player.pos.x, b.pos.y - this.player.pos.y) < absorbRadius) {
          absorbed.push(b);
          this.voidAbsorbFlashes.push({ pos: { ...b.pos }, life: 0.3, maxLife: 0.3 });
          return false;
        }
        return true;
      });

      // Fire each absorbed bullet toward nearest enemy
      const nearest = this.getNearestEnemy(this.player.pos);
      const targetPos = nearest ? nearest.pos : { x: CANVAS_WIDTH / 2, y: -50 };
      absorbed.forEach(b => {
        const dx = targetPos.x - b.pos.x;
        const dy = targetPos.y - b.pos.y;
        const dist = Math.hypot(dx, dy) || 1;
        this.bullets.push({
          id: `vc_${Date.now()}_${Math.random()}`,
          pos: { ...b.pos },
          vel: { x: (dx / dist) * 16, y: (dy / dist) * 16 },
          radius: 5,
          health: 1,
          maxHealth: 1,
          owner: 'PLAYER',
          damage: 40,
          color: '#CC44FF'
        });
      });

      // Direct void damage to enemies in range
      this.enemies.forEach(e => {
        const dist = Math.hypot(e.pos.x - this.player.pos.x, e.pos.y - this.player.pos.y);
        const isBoss = this.isBossEnemy(e);
        if (dist < absorbRadius && this.phaseTransitionTimer <= 0) {
          e.health -= 200;
          if (isBoss && e.health <= 0) { e.health = 1; this.advanceBossPhase(e); }
        }
      });

      // WotG-style: 3 staggered expanding void rings
      const origin = { ...this.player.pos };
      [0, 90, 180].forEach((delayMs, i) => {
        const push = () => this.voidConvertRings.push({
          pos: { ...origin },
          maxRadius: 430 + i * 50,
          life: 0.58,
          maxLife: 0.58,
          dashOffset: Math.random() * 20
        });
        if (delayMs === 0) push(); else setTimeout(push, delayMs);
      });
      this.voidCenterFlash = { pos: { ...this.player.pos }, life: 0.38, maxLife: 0.38 };
      this.bgPulse = { color: '#110022', life: 0.75, maxLife: 0.75 };
      this.screenShakeTrauma = Math.min(1, this.screenShakeTrauma + 0.55);
    }
  }

  private isBossEnemy(e: Enemy): boolean {
    return e.type === 'MINIBOSS' || e.type === 'BOSS' || e.type === 'ACT_BOSS';
  }

  private getNearestEnemy(from: Vector): Enemy | null {
    let nearest: Enemy | null = null;
    let minDist = Infinity;
    this.enemies.forEach(e => {
      const d = Math.hypot(e.pos.x - from.x, e.pos.y - from.y);
      if (d < minDist) { minDist = d; nearest = e; }
    });
    return nearest;
  }

  private completeStage() {
    if (this.currentStageIndex < STAGES.length - 1) {
      this.setState('LEVELING');
    } else {
      audioService.playVictory();
      this.setState('VICTORY');
    }
  }

  public nextStage() {
    this.currentStageIndex++;
    this.setState('PLAYING');
  }

  public applyModule(module: Module) {
    audioService.playPowerup();
    switch (module.type) {
      case 'REPAIR':
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 50);
        this.player.integrity = Math.min(100, this.player.integrity + 20);
        break;
      case 'OVERCLOCK':
        this.player.experience += 500; // Bonus XP
        break;
      case 'KINETIC':
        this.kineticMult = Math.min(2.0, this.kineticMult + 0.45);
        break;
      case 'SHIELD':
        this.player.integrity = 100;
        break;
    }
  }

  public getCardOptions(): Module[] {
    const performance = (this.player.kills / 10) - (this.player.damageTaken / 50);
    const legendaryChance = Math.min(0.3, Math.max(0.05, 0.05 + performance * 0.05));
    const rareChance = Math.min(0.6, Math.max(0.2, 0.2 + performance * 0.1));

    const options: Module[] = [];
    for (let i = 0; i < 3; i++) {
      const roll = Math.random();
      let rarity: Rarity = 'COMMON';
      if (roll < legendaryChance) rarity = 'LEGENDARY';
      else if (roll < legendaryChance + rareChance) rarity = 'RARE';

      let pool = MODULE_POOL.filter(m => m.rarity === rarity);
      if (pool.length === 0) pool = MODULE_POOL.filter(m => m.rarity === 'COMMON');
      
      const randomModule = pool[Math.floor(Math.random() * pool.length)];
      options.push({ ...randomModule });
    }
    return options;
  }

  private distPointToSegment(p: Vector, a: Vector, b: Vector): number {
    const abx = b.x - a.x, aby = b.y - a.y;
    const len2 = abx * abx + aby * aby;
    if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2));
    return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby));
  }

  private draw() {
    if (!this.ctx || !this.canvas) return;

    // Background: dark navy (diagnostic — if you see this, draw() is running)
    this.ctx.fillStyle = '#F8F8F5';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.ctx.fillStyle = 'rgba(0,0,0,0.07)';
    const g = 64;
    for (let gx = g; gx < CANVAS_WIDTH; gx += g) {
      for (let gy = g; gy < CANVAS_HEIGHT; gy += g) {
        this.ctx.beginPath();
        this.ctx.arc(gx, gy, 1.5, 0, TAU);
        this.ctx.fill();
      }
    }

    // DEPTH_SCROLL: parallax dot layer scrolls upward during boss fights, making bullets feel faster
    if (STAGES[this.currentStageIndex].type !== 'NORMAL') {
      this.ctx.fillStyle = 'rgba(0,0,0,0.042)';
      const pg = 48;
      const startGy = -(this.depthScrollY % pg);
      for (let pgx = 0; pgx < CANVAS_WIDTH + pg; pgx += pg) {
        for (let pgy = startGy; pgy < CANVAS_HEIGHT + pg; pgy += pg) {
          this.ctx.beginPath();
          this.ctx.arc(pgx + 24, pgy, 1.1, 0, TAU);
          this.ctx.fill();
        }
      }
    }

    // Background event pulse (boss transition, etc.)
    if (this.bgPulse && this.bgPulse.life > 0) {
      const t = this.bgPulse.life / this.bgPulse.maxLife;
      this.ctx!.save();
      this.ctx!.globalAlpha = t * t * 0.14;
      this.ctx!.fillStyle = this.bgPulse.color;
      this.ctx!.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      this.ctx!.restore();
    }

    // Apply screen shake — all game-world elements shake together
    this.ctx!.save();
    this.ctx!.translate(this.screenShakeOffset.x, this.screenShakeOffset.y);

    // Draw special effects
    this.effects.forEach(f => {
      this.ctx!.save();
      this.ctx!.globalAlpha = f.life / f.maxLife;
      this.ctx!.strokeStyle = '#000000';
      this.ctx!.lineWidth = 2;
      this.ctx!.beginPath();
      if (f.type === 'CIRCLE') {
        this.ctx!.arc(f.pos.x, f.pos.y, f.radius * (1 - f.life / f.maxLife), 0, TAU);
      } else if (f.type === 'SQUARE') {
        const size = f.radius * (1 - f.life / f.maxLife);
        this.ctx!.rect(f.pos.x - size, f.pos.y - size, size * 2, size * 2);
      } else if (f.type === 'DISTORTION') {
        this.ctx!.arc(f.pos.x, f.pos.y, f.radius * (1 - f.life / f.maxLife), 0, TAU);
        this.ctx!.setLineDash([10, 10]);
      }
      this.ctx!.stroke();
      this.ctx!.restore();
    });

    // Void Convert: WotG-style expanding rings + absorb flashes + center flash
    if (this.voidCenterFlash) {
      const cf = this.voidCenterFlash;
      const cfProg = 1 - cf.life / cf.maxLife;
      const cfR = 80 + cfProg * 200;
      const cfAlpha = cf.life / cf.maxLife;
      const grad = this.ctx!.createRadialGradient(cf.pos.x, cf.pos.y, 0, cf.pos.x, cf.pos.y, cfR);
      grad.addColorStop(0, `rgba(220,100,255,${cfAlpha * 0.7})`);
      grad.addColorStop(0.4, `rgba(140,0,255,${cfAlpha * 0.35})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      this.ctx!.save();
      this.ctx!.fillStyle = grad;
      this.ctx!.beginPath();
      this.ctx!.arc(cf.pos.x, cf.pos.y, cfR, 0, TAU);
      this.ctx!.fill();
      this.ctx!.restore();
    }

    this.voidConvertRings.forEach(ring => {
      const prog = 1 - ring.life / ring.maxLife;
      const r = ring.maxRadius * prog;
      const alpha = ring.life / ring.maxLife;

      this.ctx!.save();
      // Chromatic aberration: draw 3 offset rings for the "reality distortion" look
      [{ dx: -2, dy: -2, color: `rgba(80,0,180,${alpha * 0.6})` },
       { dx: 0,  dy: 0,  color: `rgba(180,0,255,${alpha * 0.9})` },
       { dx: 2,  dy: 2,  color: `rgba(255,100,255,${alpha * 0.5})` }].forEach(({ dx, dy, color }) => {
        this.ctx!.strokeStyle = color;
        this.ctx!.lineWidth = Math.max(0.5, 3.5 - prog * 2.5);
        this.ctx!.setLineDash([14, 9]);
        this.ctx!.lineDashOffset = ring.dashOffset + prog * 40;
        this.ctx!.beginPath();
        this.ctx!.arc(ring.pos.x + dx, ring.pos.y + dy, Math.max(1, r), 0, TAU);
        this.ctx!.stroke();
      });
      this.ctx!.setLineDash([]);
      this.ctx!.restore();
    });

    this.voidAbsorbFlashes.forEach(f => {
      const alpha = f.life / f.maxLife;
      const r = 8 * alpha;
      this.ctx!.save();
      this.ctx!.globalAlpha = alpha;
      this.ctx!.shadowBlur = 14;
      this.ctx!.shadowColor = '#FF44FF';
      this.ctx!.fillStyle = '#CC44FF';
      this.ctx!.beginPath();
      this.ctx!.arc(f.pos.x, f.pos.y, r, 0, TAU);
      this.ctx!.fill();
      this.ctx!.restore();
    });

    // PULSE_NODE: ghost cube trails during dash
    if (this.player.shipType === 'PULSE_NODE') {
      this.dashTrails.forEach(t => {
        this.ctx!.save();
        this.ctx!.globalAlpha = (1 - t.life / t.maxLife) * 0.4;
        this.ctx!.strokeStyle = '#222222';
        this.ctx!.lineWidth = 2;
        this.ctx!.translate(t.pos.x, t.pos.y);
        this.ctx!.rotate(t.rot);
        const tr = this.player.radius * 1.5;
        this.ctx!.strokeRect(-tr, -tr, tr * 2, tr * 2);
        this.ctx!.restore();
      });
    }

    // Draw player trails — per-ship shape and color
    this.playerTrails.forEach(t => {
      const frac = 1 - t.life / t.maxLife;
      this.ctx!.save();
      this.ctx!.globalAlpha = Math.pow(frac, 1.6) * 0.6;
      if (this.player.shipType === 'VOID_SPIRE') {
        this.ctx!.fillStyle = '#7700CC';
        this.ctx!.beginPath();
        this.ctx!.arc(t.pos.x, t.pos.y, this.player.radius * 0.65, 0, TAU);
        this.ctx!.fill();
      } else if (this.player.shipType === 'PULSE_NODE') {
        this.ctx!.fillStyle = '#0A1525';
        const ts = this.player.radius * 0.55;
        this.ctx!.fillRect(t.pos.x - ts, t.pos.y - ts, ts * 2, ts * 2);
      } else {
        this.ctx!.fillStyle = '#0099BB';
        this.ctx!.beginPath();
        this.ctx!.arc(t.pos.x, t.pos.y, this.player.radius * 0.65, 0, TAU);
        this.ctx!.fill();
      }
      this.ctx!.restore();
    });

    // Draw player (Geometric Templates)
    const r = this.player.radius * 1.5;
    const isDashing = this.player.shipType === 'PULSE_NODE' && this.dashDuration > 0;

    this.ctx!.save();
    this.ctx!.translate(this.player.pos.x, this.player.pos.y);

    if (this.player.shipType === 'VOTIVE_ORB') {
      this.ctx!.rotate(this.playerTilt);
      this.ctx!.scale(this.playerSquish.x, this.playerSquish.y);
      if (this.player.specialMeter >= SPECIAL_COST) {
        this.ctx!.shadowBlur = 20;
        this.ctx!.shadowColor = '#00CCFF';
      }
      // Outer sigil ring (dashed)
      this.ctx!.strokeStyle = '#336677';
      this.ctx!.lineWidth = 2.5;
      this.ctx!.setLineDash([6, 4]);
      this.ctx!.beginPath();
      this.ctx!.arc(0, 0, r, 0, TAU);
      this.ctx!.stroke();
      this.ctx!.setLineDash([]);
      // Inner ring
      this.ctx!.strokeStyle = '#0099BB';
      this.ctx!.lineWidth = 1.5;
      this.ctx!.beginPath();
      this.ctx!.arc(0, 0, r * 0.52, 0, TAU);
      this.ctx!.stroke();
      // Center dot
      this.ctx!.fillStyle = '#0099BB';
      this.ctx!.shadowBlur = 6;
      this.ctx!.shadowColor = '#00CCFF';
      this.ctx!.beginPath();
      this.ctx!.arc(0, 0, r * 0.18, 0, TAU);
      this.ctx!.fill();
      // Orbiting particle
      const ox = Math.cos(this.votiveOrbAngle) * r * 0.76;
      const oy = Math.sin(this.votiveOrbAngle) * r * 0.76;
      this.ctx!.shadowBlur = 10;
      this.ctx!.shadowColor = '#00EEFF';
      this.ctx!.fillStyle = '#AAEEFF';
      this.ctx!.beginPath();
      this.ctx!.arc(ox, oy, r * 0.16, 0, TAU);
      this.ctx!.fill();

    } else if (this.player.shipType === 'PULSE_NODE') {
      this.ctx!.rotate(this.cubeRotation);
      this.ctx!.scale(
        (1 + this.dashSquish * 0.5) * this.playerSquish.x,
        (1 - this.dashSquish * 0.3) * this.playerSquish.y
      );
      if (isDashing) {
        this.ctx!.shadowBlur = 22;
        this.ctx!.shadowColor = '#FFFFFF';
      } else if (this.dashCooldown <= 0) {
        this.ctx!.shadowBlur = 12;
        this.ctx!.shadowColor = '#0055AA';
      } else if (this.player.specialMeter >= SPECIAL_COST) {
        this.ctx!.shadowBlur = 15;
        this.ctx!.shadowColor = '#0088FF';
      }
      // Outer square
      this.ctx!.fillStyle = isDashing ? 'rgba(255,255,255,0.8)' : 'rgba(5,15,35,0.88)';
      this.ctx!.strokeStyle = isDashing ? '#FFFFFF' : '#1A3A6A';
      this.ctx!.lineWidth = 2.5;
      this.ctx!.beginPath();
      this.ctx!.rect(-r, -r, r * 2, r * 2);
      this.ctx!.fill();
      this.ctx!.stroke();
      // Inner counter-rotating square
      this.ctx!.save();
      this.ctx!.rotate(-this.cubeRotation * 2);
      this.ctx!.strokeStyle = isDashing ? '#AACCFF' : '#0066DD';
      this.ctx!.lineWidth = 1.5;
      const ir = r * 0.55;
      this.ctx!.beginPath();
      this.ctx!.rect(-ir, -ir, ir * 2, ir * 2);
      this.ctx!.stroke();
      this.ctx!.restore();
      // Corner accent dots (in outer square space)
      if (!isDashing) {
        this.ctx!.fillStyle = '#0088FF';
        this.ctx!.shadowBlur = 7;
        this.ctx!.shadowColor = '#0088FF';
        ([[-r, -r], [r, -r], [r, r], [-r, r]] as [number, number][]).forEach(([cx, cy]) => {
          this.ctx!.beginPath();
          this.ctx!.arc(cx, cy, 2.5, 0, TAU);
          this.ctx!.fill();
        });
      }

    } else {
      // VOID_SPIRE
      this.ctx!.rotate(this.voidSpireAngle);
      this.ctx!.scale(this.playerSquish.x, this.playerSquish.y);
      if (this.player.specialMeter >= SPECIAL_COST) {
        this.ctx!.shadowBlur = 15;
        this.ctx!.shadowColor = '#9933FF';
      }
      this.ctx!.fillStyle = 'rgba(0, 0, 0, 0.2)';
      this.ctx!.strokeStyle = '#000000';
      this.ctx!.lineWidth = 3;
      this.ctx!.beginPath();
      this.ctx!.moveTo(0, -r * 1.2);
      this.ctx!.lineTo(r, r);
      this.ctx!.lineTo(-r, r);
      this.ctx!.closePath();
      this.ctx!.fill();
      this.ctx!.stroke();
    }

    this.ctx!.restore();

    // Speed lines when moving fast (JSAB feel)
    const moveSpd = Math.hypot(this.player.vel.x, this.player.vel.y);
    const maxSpd = SHIP_SETTINGS[this.player.shipType].normalSpeed;
    if (moveSpd > maxSpd * 0.45) {
      const speedFrac = Math.min(1, moveSpd / maxSpd);
      const moveAng = Math.atan2(this.player.vel.y, this.player.vel.x) + Math.PI;
      this.ctx!.save();
      this.ctx!.strokeStyle = this.player.shipType === 'VOID_SPIRE' ? '#7700CC'
        : this.player.shipType === 'PULSE_NODE' ? '#0055AA' : '#0099BB';
      this.ctx!.lineWidth = 1;
      for (let li = 0; li < 5; li++) {
        const spread = (Math.random() - 0.5) * 1.1;
        const lineLen = (16 + Math.random() * 28) * speedFrac;
        const ox = Math.cos(moveAng + Math.PI + spread) * this.player.radius;
        const oy = Math.sin(moveAng + Math.PI + spread) * this.player.radius;
        this.ctx!.globalAlpha = 0.22 * speedFrac;
        this.ctx!.beginPath();
        this.ctx!.moveTo(this.player.pos.x + ox, this.player.pos.y + oy);
        this.ctx!.lineTo(
          this.player.pos.x + ox + Math.cos(moveAng) * lineLen,
          this.player.pos.y + oy + Math.sin(moveAng) * lineLen
        );
        this.ctx!.stroke();
      }
      this.ctx!.restore();
    }

    // PULSE_NODE: dash cooldown arc indicator below the cube
    if (this.player.shipType === 'PULSE_NODE') {
      const progress = 1 - Math.min(this.dashCooldown / this.DASH_MAX_COOLDOWN, 1);
      this.ctx!.save();
      this.ctx!.strokeStyle = progress >= 1 ? '#111111' : '#BBBBBB';
      this.ctx!.lineWidth = 2;
      this.ctx!.beginPath();
      this.ctx!.arc(this.player.pos.x, this.player.pos.y + r + 9, 6, -Math.PI / 2, -Math.PI / 2 + TAU * progress);
      this.ctx!.stroke();
      this.ctx!.restore();
    }

    // Draw graze rings (gold expanding ring from hitbox outward)
    this.grazeFlashes.forEach(f => {
      const prog = 1 - f.life / f.maxLife;
      const ringR = HITBOX_RADIUS + prog * (GRAZE_RADIUS - HITBOX_RADIUS + 6);
      this.ctx!.save();
      this.ctx!.globalAlpha = (f.life / f.maxLife) * 0.9;
      this.ctx!.strokeStyle = '#FFE033';
      this.ctx!.lineWidth = 1.5;
      this.ctx!.shadowBlur = 8;
      this.ctx!.shadowColor = '#FFCC00';
      this.ctx!.beginPath();
      this.ctx!.arc(f.pos.x, f.pos.y, ringR, 0, TAU);
      this.ctx!.stroke();
      this.ctx!.restore();
    });

    // Draw hitbox in focus mode
    const isFocus = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    if (isFocus) {
      this.ctx!.fillStyle = '#FFFFFF';
      this.ctx!.strokeStyle = '#000000';
      this.ctx!.lineWidth = 2;
      this.ctx!.beginPath();
      this.ctx!.arc(this.player.pos.x, this.player.pos.y, HITBOX_RADIUS, 0, TAU);
      this.ctx!.fill();
      this.ctx!.stroke();
    }

    // Draw bullets (enemy bullets glow, player bullets are crisp)
    this.bullets.forEach((b) => {
      this.ctx!.save();
      if (b.owner === 'ENEMY') {
        this.ctx!.shadowBlur = 10;
        this.ctx!.shadowColor = b.color;
      }
      this.ctx!.fillStyle = b.color;
      this.ctx!.beginPath();
      this.ctx!.arc(b.pos.x, b.pos.y, b.radius, 0, TAU);
      this.ctx!.fill();
      this.ctx!.restore();
    });

    // Draw death particles
    this.particles.forEach(p => {
      this.ctx!.save();
      this.ctx!.globalAlpha = p.life / p.maxLife;
      this.ctx!.fillStyle = p.color;
      this.ctx!.beginPath();
      this.ctx!.arc(p.pos.x, p.pos.y, p.radius, 0, TAU);
      this.ctx!.fill();
      this.ctx!.restore();
    });

    // Draw enemies
    this.enemies.forEach((e) => {
      const isBoss = this.isBossEnemy(e);
      const color = isBoss ? '#FF0000' : e.type === 'VOLT' ? '#FF8800' : e.type === 'BASTION' ? '#4466FF' : '#000000';

      this.ctx!.save();
      this.ctx!.strokeStyle = color;
      this.ctx!.lineWidth = isBoss ? 4 : 2;

      if (isBoss) {
        this.ctx!.beginPath();
        this.ctx!.rect(e.pos.x - e.radius, e.pos.y - e.radius, e.radius * 2, e.radius * 2);
        this.ctx!.stroke();
      } else if (e.type === 'VOLT') {
        // Diamond shape — fast sweeper
        const r = e.radius;
        this.ctx!.beginPath();
        this.ctx!.moveTo(e.pos.x, e.pos.y - r);
        this.ctx!.lineTo(e.pos.x + r, e.pos.y);
        this.ctx!.lineTo(e.pos.x, e.pos.y + r);
        this.ctx!.lineTo(e.pos.x - r, e.pos.y);
        this.ctx!.closePath();
        this.ctx!.stroke();
      } else if (e.type === 'BASTION') {
        // Large square with inner crosshair
        this.ctx!.beginPath();
        this.ctx!.rect(e.pos.x - e.radius, e.pos.y - e.radius, e.radius * 2, e.radius * 2);
        this.ctx!.stroke();
        this.ctx!.beginPath();
        this.ctx!.moveTo(e.pos.x - e.radius * 0.5, e.pos.y);
        this.ctx!.lineTo(e.pos.x + e.radius * 0.5, e.pos.y);
        this.ctx!.moveTo(e.pos.x, e.pos.y - e.radius * 0.5);
        this.ctx!.lineTo(e.pos.x, e.pos.y + e.radius * 0.5);
        this.ctx!.stroke();
      } else {
        // STRIKER — small square
        this.ctx!.beginPath();
        this.ctx!.rect(e.pos.x - 15, e.pos.y - 15, 30, 30);
        this.ctx!.stroke();
      }

      this.ctx!.restore();

      // Boss hit flash — white overlay flickers on damage
      if (isBoss && this.bossHitFlash > 0) {
        this.ctx!.save();
        this.ctx!.globalAlpha = this.bossHitFlash * 0.55;
        this.ctx!.fillStyle = '#FFFFFF';
        this.ctx!.fillRect(e.pos.x - e.radius - 4, e.pos.y - e.radius - 4, e.radius * 2 + 8, e.radius * 2 + 8);
        this.ctx!.restore();
      }

      // Phase HP bar + phase card name above boss
      if (isBoss) {
        const currentPhase = this.bossPhases[this.currentBossPhaseIdx];
        const isSpecialPhase = currentPhase?.type === 'SPECIAL';
        const barColor = isSpecialPhase ? '#FF00AA' : '#FF3333';
        const barW = e.radius * 4;
        this.ctx!.fillStyle = '#EEEEEE';
        this.ctx!.fillRect(e.pos.x - barW / 2, e.pos.y - e.radius - 22, barW, 6);
        this.ctx!.fillStyle = barColor;
        this.ctx!.fillRect(e.pos.x - barW / 2, e.pos.y - e.radius - 22, barW * Math.max(0, e.health / e.maxHealth), 6);
        // Phase dots row
        const totalPhases = this.bossPhases.length;
        const dotSpacing = 14;
        const dotsStartX = e.pos.x - (totalPhases * dotSpacing) / 2;
        for (let pi = 0; pi < totalPhases; pi++) {
          const ph = this.bossPhases[pi];
          const dotX = dotsStartX + pi * dotSpacing;
          const dotY = e.pos.y - e.radius - 32;
          this.ctx!.fillStyle = pi < this.currentBossPhaseIdx ? '#888888' : pi === this.currentBossPhaseIdx ? (isSpecialPhase ? '#FF00AA' : '#FF3333') : ph.type === 'SPECIAL' ? 'rgba(255,0,170,0.3)' : 'rgba(255,51,51,0.3)';
          this.ctx!.beginPath();
          this.ctx!.arc(dotX, dotY, 4, 0, TAU);
          this.ctx!.fill();
        }
      }
    });

    // End screen shake transform — UI elements below are fixed to screen
    this.ctx!.restore();

    // Boss phase card overlay
    if (this.bossPhases.length > 0 && !this.phaseTransitionTimer) {
      const currentPhase = this.bossPhases[this.currentBossPhaseIdx];
      if (currentPhase) {
        const isSpecial = currentPhase.type === 'SPECIAL';
        // Subtle tinted border during special phases
        if (isSpecial) {
          this.ctx!.save();
          this.ctx!.strokeStyle = 'rgba(255,0,170,0.25)';
          this.ctx!.lineWidth = 8;
          this.ctx!.strokeRect(4, 4, CANVAS_WIDTH - 8, CANVAS_HEIGHT - 8);
          this.ctx!.restore();
        }
        // Phase label at top-center
        this.ctx!.save();
        this.ctx!.textAlign = 'center';
        this.ctx!.font = 'bold 16px monospace';
        this.ctx!.fillStyle = isSpecial ? '#FF00AA' : '#333333';
        const label = isSpecial
          ? `◇ ${currentPhase.pattern.replace('SPELL_', '')} ◇`
          : `PHASE ${this.currentBossPhaseIdx + 1} / ${this.bossPhases.length}`;
        this.ctx!.fillText(label, CANVAS_WIDTH / 2, 40);
        this.ctx!.restore();
      }
    }

    // Phase transition flash
    if (this.phaseTransitionTimer > 0) {
      const t = this.phaseTransitionTimer / 1.8;
      this.ctx!.save();
      this.ctx!.globalAlpha = t * 0.35;
      this.ctx!.fillStyle = '#FFFFFF';
      this.ctx!.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      this.ctx!.restore();
    }

    // Spell Card Announce Freeze overlay
    if (this.spellAnnounceFreezeTimer > 0) {
      const currentPhase = this.bossPhases[this.currentBossPhaseIdx];
      if (currentPhase?.type === 'SPECIAL') {
        const t = this.spellAnnounceFreezeTimer / 1.5;
        const pulse = Math.sin(t * Math.PI);
        this.ctx!.save();
        this.ctx!.globalAlpha = Math.min(0.5, (1 - t) * 1.5 + 0.15);
        this.ctx!.fillStyle = '#0A0015';
        this.ctx!.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        this.ctx!.globalAlpha = pulse * 0.7;
        this.ctx!.strokeStyle = '#FF00AA';
        this.ctx!.lineWidth = 3;
        this.ctx!.strokeRect(40, 40, CANVAS_WIDTH - 80, CANVAS_HEIGHT - 80);
        this.ctx!.globalAlpha = Math.min(1, (1 - t) * 3) * pulse;
        this.ctx!.textAlign = 'center';
        this.ctx!.font = 'bold 18px monospace';
        this.ctx!.fillStyle = '#FF88DD';
        this.ctx!.fillText('SPELL CARD', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 72);
        this.ctx!.font = 'bold 52px monospace';
        this.ctx!.fillStyle = '#FF00AA';
        this.ctx!.shadowBlur = 24;
        this.ctx!.shadowColor = '#FF00AA';
        this.ctx!.fillText(`◇ ${currentPhase.pattern.replace('SPELL_', '')} ◇`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        this.ctx!.restore();
      }
    }

    // Phase / spell bonus notification
    if (this.phaseNotif && this.phaseNotif.life > 0) {
      const alpha = Math.min(1, this.phaseNotif.life / 0.4) * Math.min(1, (this.phaseNotif.life) / this.phaseNotif.maxLife * 3);
      const isBonus = this.phaseNotif.text.includes('BONUS');
      this.ctx!.save();
      this.ctx!.globalAlpha = alpha;
      this.ctx!.textAlign = 'center';
      this.ctx!.font = `bold ${isBonus ? 28 : 22}px monospace`;
      this.ctx!.fillStyle = isBonus ? '#FFD700' : this.phaseNotif.text.includes('◇') ? '#FF00AA' : '#333333';
      this.ctx!.fillText(this.phaseNotif.text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);
      this.ctx!.restore();
    }

    // Graze streak HUD (bottom-left, fades when streak expires)
    if (this.grazeStreak > 0 && this.grazeStreakTimer > 0) {
      const fadeAlpha = Math.min(1, this.grazeStreakTimer * 3);
      this.ctx!.save();
      this.ctx!.globalAlpha = fadeAlpha;
      this.ctx!.textAlign = 'left';
      this.ctx!.font = 'bold 14px monospace';
      this.ctx!.fillStyle = '#FFE033';
      this.ctx!.shadowBlur = 8;
      this.ctx!.shadowColor = '#FFAA00';
      this.ctx!.fillText(`GRAZE  ×${this.grazeStreak}`, 32, CANVAS_HEIGHT - 72);
      this.ctx!.restore();
    }

    // VOID Stack HUD (VOID_SPIRE only)
    if (this.player.shipType === 'VOID_SPIRE' && this.voidStacks > 0) {
      const stackAlpha = this.voidStackTimer > 0.4 ? 1 : this.voidStackTimer / 0.4;
      this.ctx!.save();
      this.ctx!.globalAlpha = stackAlpha;
      this.ctx!.textAlign = 'left';
      this.ctx!.font = 'bold 13px monospace';
      this.ctx!.fillStyle = '#AA44FF';
      this.ctx!.shadowBlur = 8;
      this.ctx!.shadowColor = '#7700CC';
      const filled = '◈'.repeat(this.voidStacks);
      const empty = '◇'.repeat(5 - this.voidStacks);
      const mult = (1 + this.voidStacks * 0.08).toFixed(2);
      this.ctx!.fillText(`VOID  ${filled}${empty}  ×${mult}`, 32, CANVAS_HEIGHT - 52);
      this.ctx!.restore();
    }

    // Hit flash overlay
    if (this.hitFlashTimer > 0) {
      this.ctx!.save();
      this.ctx!.globalAlpha = (this.hitFlashTimer / 0.28) * 0.22;
      this.ctx!.fillStyle = '#FF1111';
      this.ctx!.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      this.ctx!.restore();
    }
  }
}
