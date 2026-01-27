export const TEAM_COLORS = ["BLUE", "BLACK", "WHITE", "RED"] as const;

export type TeamColor = (typeof TEAM_COLORS)[number];
