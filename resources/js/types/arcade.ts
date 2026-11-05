/** One row of an arcade leaderboard (ArcadeScore::leaderboard): a player's best score. */
export type ArcadeScoreEntry = {
    rank: number;
    userId: number;
    username: string;
    score: number;
};

export type ArcadeLeaderboards = {
    today: ArcadeScoreEntry[];
    week: ArcadeScoreEntry[];
    allTime: ArcadeScoreEntry[];
};

/** ArcadeController::scores, for the popup at a cabinet. */
export type ArcadeScores = {
    personalBest: number;
    leaderboards: ArcadeLeaderboards;
};

/** ArcadeController::finish: the saved run. */
export type ArcadeRunResult = ArcadeScores & {
    score: number;
    isHighscore: boolean;
};
