import { Module, StageInfo, Difficulty, BossPhase } from './types';

export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;
export const TAU = Math.PI * 2;

// Global Balance Constants
export const HITBOX_RADIUS = 4;
export const GRAZE_RADIUS = 15;
export const RESPAWN_INVULN_TIME = 3000;
export const SPECIAL_INVULN_TIME = 2000;
export const BASE_DPS_TARGET = 100;
export const SPECIAL_COST = 50;
export const MAX_SPECIAL_METER = 100;

// Ship Specific Constants
export const SHIP_SETTINGS = {
  VOTIVE_ORB: {
    normalSpeed: 4.5, // px/frame
    focusSpeed: 2.0,
    acceleration: 0.9, // Near instant
    deceleration: 0.9,
    primaryFireRate: 100,
    altFireRate: 120,
    bulletSpeed: 12,
    specialType: 'CIRCLE_BOMB'
  },
  PULSE_NODE: {
    normalSpeed: 5.0,
    focusSpeed: 2.1,
    acceleration: 1.0, // Instant
    deceleration: 1.0,
    primaryFireRate: 150, // Burst feel
    altFireRate: 80, // Rapid pulse
    bulletSpeed: 10,
    specialType: 'SHOCK_PULSE'
  },
  VOID_SPIRE: {
    normalSpeed: 4.7,
    focusSpeed: 1.9,
    acceleration: 0.7,
    deceleration: 0.5,
    primaryFireRate: 130,
    altFireRate: 150,
    bulletSpeed: 14,
    specialType: 'DISTORTION_PULSE'
  }
};

export const PLAYER_SPEED = 6;
export const FOCUS_SPEED_MULTIPLIER = 0.4;
export const PLAYER_RADIUS = 8;
export const PLAYER_MAX_HEALTH = 100;

export const BULLET_SPEED = 12;
export const BULLET_RADIUS = 3;

export const ENEMY_SPEED = 2.5;
export const ENEMY_RADIUS = 20;

export const BOMB_RADIUS = 400;
export const BOMB_DAMAGE = 100;
export const BOMB_DURATION = 1500;

export const MINIBOSS_PHASES: BossPhase[] = [
  { type: 'NORMAL',  hp: 280, pattern: 'AIMED_SPREAD' },
  { type: 'SPECIAL', hp: 200, pattern: 'SPELL_SPIRAL' },
  { type: 'NORMAL',  hp: 320, pattern: 'CROSS_AIMED' },
  { type: 'SPECIAL', hp: 240, pattern: 'SPELL_WALLS' },
];

export const BOSS_PHASES: BossPhase[] = [
  { type: 'NORMAL',  hp: 350, pattern: 'AIMED_SPREAD' },
  { type: 'SPECIAL', hp: 250, pattern: 'SPELL_FLOWER' },
  { type: 'NORMAL',  hp: 400, pattern: 'AIMED_FAN' },
  { type: 'SPECIAL', hp: 280, pattern: 'SPELL_SPIRAL' },
  { type: 'NORMAL',  hp: 450, pattern: 'CROSS_AIMED' },
  { type: 'SPECIAL', hp: 300, pattern: 'SPELL_LASER_CROSS' },
  { type: 'NORMAL',  hp: 480, pattern: 'DENSE_AIMED' },
  { type: 'SPECIAL', hp: 320, pattern: 'SPELL_BUTTERFLY' },
  { type: 'NORMAL',  hp: 500, pattern: 'ALL_OUT' },
  { type: 'SPECIAL', hp: 380, pattern: 'SPELL_STORM' },
];

export const ACT_BOSS_PHASES: BossPhase[] = [
  { type: 'NORMAL',  hp: 600,  pattern: 'AIMED_SPREAD' },
  { type: 'SPECIAL', hp: 500,  pattern: 'SPELL_SPIRAL' },
  { type: 'NORMAL',  hp: 650,  pattern: 'ROTATING_RING' },
  { type: 'SPECIAL', hp: 520,  pattern: 'SPELL_WALLS' },
  { type: 'NORMAL',  hp: 700,  pattern: 'AIMED_FAN' },
  { type: 'SPECIAL', hp: 550,  pattern: 'SPELL_FLOWER' },
  { type: 'NORMAL',  hp: 750,  pattern: 'DENSE_AIMED' },
  { type: 'SPECIAL', hp: 580,  pattern: 'SPELL_BUTTERFLY' },
  { type: 'NORMAL',  hp: 800,  pattern: 'ALL_OUT' },
  { type: 'SPECIAL', hp: 620,  pattern: 'SPELL_VORTEX' },
  { type: 'NORMAL',  hp: 850,  pattern: 'CROSS_AIMED' },
  { type: 'SPECIAL', hp: 660,  pattern: 'SPELL_STORM' },
  { type: 'NORMAL',  hp: 900,  pattern: 'AIMED_FAN' },
  { type: 'SPECIAL', hp: 700,  pattern: 'SPELL_MIRAGE' },
  { type: 'NORMAL',  hp: 950,  pattern: 'DENSE_AIMED' },
  { type: 'SPECIAL', hp: 720,  pattern: 'SPELL_GALAXY' },
  { type: 'NORMAL',  hp: 1000, pattern: 'ROTATING_RING' },
  { type: 'SPECIAL', hp: 750,  pattern: 'SPELL_HYPNOSIS' },
  { type: 'NORMAL',  hp: 1100, pattern: 'ALL_OUT' },
  { type: 'SPECIAL', hp: 800,  pattern: 'SPELL_HELIX' },
];

export const STAGES: StageInfo[] = [
  { number: 1, type: 'NORMAL',   enemyCount: 55 },
  { number: 2, type: 'MINIBOSS', enemyCount: 1 },
  { number: 3, type: 'NORMAL',   enemyCount: 65 },
  { number: 4, type: 'BOSS',     enemyCount: 1 },
  { number: 5, type: 'NORMAL',   enemyCount: 80 },
  { number: 6, type: 'ACT_BOSS', enemyCount: 1 },
];

export const DIFFICULTY_SETTINGS: Record<Difficulty, { 
  multiplier: number, 
  description: string,
  initialBombs: number,
  enemyCountMultiplier: number,
  bossHealthMultiplier: number
}> = {
  'STABLE': { 
    multiplier: 1.0, 
    description: 'Standard Euclidean parameters. Predictable flux.',
    initialBombs: 3,
    enemyCountMultiplier: 1.0,
    bossHealthMultiplier: 1.0
  },
  'FLUX': { 
    multiplier: 1.5, 
    description: 'Increased entropy. System integrity compromised.',
    initialBombs: 2,
    enemyCountMultiplier: 1.3,
    bossHealthMultiplier: 1.5
  },
  'CHAOS': { 
    multiplier: 2.5, 
    description: 'Total architecture collapse. Non-Euclidean nightmare.',
    initialBombs: 1,
    enemyCountMultiplier: 1.8,
    bossHealthMultiplier: 2.5
  },
};

export const MODULE_POOL: Module[] = [
  { id: 'refr_1', name: 'REFRACTION', description: 'Redirect incoming kinetic energy into a concentrated beam.', type: 'REFRACTION', rarity: 'COMMON' },
  { id: 'kin_1', name: 'KINETIC', description: 'Amplify physical impact parameters by 45%.', type: 'KINETIC', rarity: 'COMMON' },
  { id: 'over_1', name: 'OVERCLOCK', description: 'Bypass safety limiters. Increases velocity.', type: 'OVERCLOCK', rarity: 'RARE' },
  { id: 'rep_1', name: 'REPAIR', description: 'Emergency integrity restoration protocols.', type: 'REPAIR', rarity: 'COMMON' },
  { id: 'shld_1', name: 'SHIELD', description: 'Deploy temporary non-Euclidean barrier.', type: 'SHIELD', rarity: 'LEGENDARY' },
];
