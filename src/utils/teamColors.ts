import { TEAM_COLORS } from "../constants/teamColors";
import type { TeamColor } from "../constants/teamColors";

export const TEAM_COLOR_BY_TEAM_NUMBER: Record<1 | 2 | 3 | 4, TeamColor> = {
  1: "BLUE",
  2: "BLACK",
  3: "WHITE",
  4: "RED"
};

export { TEAM_COLORS };
