export interface ScoreEntry {
  name: string;
  score: number;
  kills: number;
  stage: number;
  shipType: string;
  date: string;
}

const KEY = 'architecs_leaderboard';

export const scoreService = {
  calculate(kills: number, level: number, experience: number): number {
    return kills * 100 + (level - 1) * 1000 + Math.floor(experience);
  },
  save(entry: ScoreEntry): void {
    const list = this.list();
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 10)));
  },
  list(): ScoreEntry[] {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '[]');
    } catch {
      return [];
    }
  },
};
