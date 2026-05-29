// Re-export all types and add helper functions
export { db, supabase, TEAM_MEMBERS, ALL_PARTICIPANTS } from './db';
export type { Project, Reservation, ProjectPhase, ProjectNote } from './db';

// Team color helper functions (mirrors the `us` and `TI` functions from compiled JS)
export function getTeamColorClass(team: string): string {
  switch (team) {
    case 'EVE': return 'bg-team-eve';
    case 'FE': return 'bg-team-fe';
    case 'BE': return 'bg-team-be';
    case 'APP': return 'bg-team-app';
    case 'C레벨': return 'bg-team-clevel';
    case '전체': return 'bg-team-all';
    default: return 'bg-team-custom';
  }
}

export function getTeamGanttColors(team: string): { bg30: string; border: string; solid: string } {
  switch (team) {
    case 'EVE': return { bg30: 'bg-team-eve/30', border: 'border-team-eve', solid: 'bg-team-eve' };
    case 'FE': return { bg30: 'bg-team-fe/30', border: 'border-team-fe', solid: 'bg-team-fe' };
    case 'BE': return { bg30: 'bg-team-be/30', border: 'border-team-be', solid: 'bg-team-be' };
    case 'APP': return { bg30: 'bg-team-app/30', border: 'border-team-app', solid: 'bg-team-app' };
    case 'C레벨': return { bg30: 'bg-team-clevel/30', border: 'border-team-clevel', solid: 'bg-team-clevel' };
    case '전체': return { bg30: 'bg-team-all/30', border: 'border-team-all', solid: 'bg-team-all' };
    default: return { bg30: 'bg-team-custom/30', border: 'border-team-custom', solid: 'bg-team-custom' };
  }
}

export function getReservationColorClass(r: { teams: string[] }): string {
  return r.teams && r.teams.length > 0 ? getTeamColorClass(r.teams[0]) : 'bg-team-custom';
}
