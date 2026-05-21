export type GameState = 'MENU' | 'SHIP_SELECT' | 'DIFFICULTY_SELECT' | 'PLAYING' | 'LEVELING' | 'STAGE_COMPLETE' | 'GAME_OVER' | 'VICTORY';

export type Difficulty = 'STABLE' | 'FLUX' | 'CHAOS';

export interface Vector {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  pos: Vector;
  vel: Vector;
  radius: number;
  health: number;
  maxHealth: number;
}

export interface Player extends Entity {
  rank: string;
  experience: number;
  level: number;
  integrity: number; // 0 to 100
  syncRate: number;
  lastPos: Vector;
  kills: number;
  damageTaken: number;
  bombs: number;
  fireMode: 'PRIMARY' | 'ALTERNATE';
  specialMeter: number;
  maxSpecialMeter: number;
  shipType: 'VOTIVE_ORB' | 'PULSE_NODE' | 'VOID_SPIRE';
}

export interface Bullet extends Entity {
  owner: 'PLAYER' | 'ENEMY';
  damage: number;
  color: string;
  angularVelocity?: number;
  reverseAt?: number;
}

export interface Enemy extends Entity {
  type: 'STRIKER' | 'BASTION' | 'VOLT' | 'MINIBOSS' | 'BOSS' | 'ACT_BOSS';
  scoreValue: number;
  pattern?: string;
  fireRate?: number;
  lastFired?: number;
  targetY?: number;
  moveTimer?: number;
  phase?: number;
  phaseTimer?: number;
  angle?: number;
  spawnX?: number;
  sweepDir?: number;
  formation?: 'SNAKE' | 'V_DIVE' | 'PINCER' | 'GRID_WEAVE' | 'RICOCHET';
  formationIndex?: number;
  formationTimer?: number;
}

export type Rarity = 'COMMON' | 'RARE' | 'LEGENDARY';

export interface Module {
  id: string;
  name: string;
  description: string;
  type: 'REFRACTION' | 'KINETIC' | 'OVERCLOCK' | 'REPAIR' | 'SHIELD';
  rarity: Rarity;
  recommended?: boolean;
}

export interface StageInfo {
  number: number;
  type: 'NORMAL' | 'MINIBOSS' | 'BOSS' | 'ACT_BOSS';
  enemyCount: number;
}

export interface BossPhase {
  type: 'NORMAL' | 'SPECIAL';
  hp: number;
  pattern: string;
}

export type GimmickType = 'CORNER_TURRET' | 'LASER_SWEEP' | 'SAW_ARMS' | 'ARENA_COMPRESS';

export interface Gimmick {
  id: string;
  type: GimmickType;
  pos?: Vector;
  lastFired?: number;
  y?: number;
  sweepPhase?: 'WARN' | 'FIRE' | 'DONE';
  timer?: number;
  angle?: number;
  rotSpeed?: number;
  armCount?: number;
  armLength?: number;
  wallLeft?: number;
  wallRight?: number;
  compressPhase?: 'CLOSING' | 'HOLD' | 'OPENING';
}
