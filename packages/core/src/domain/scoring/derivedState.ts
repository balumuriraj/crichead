import { BallEvent } from '../schema';

/** The minimal subset of match config that the scoring engine needs */
export interface ScoringEngineConfig {
  oversPerInnings?: number;
  wicketsPerInnings?: number;
}

export interface BowlerStats {
  validBalls: number;
  runs: number;
  wickets: number;
  maidens: number;
}

export interface BatterStats {
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
}

export interface DerivedMatchState {
  totalRuns: number;
  totalWickets: number;
  validBalls: number;
  currentOver: number;
  currentBall: number;
  
  currentStrikerId: string | null;
  currentNonStrikerId: string | null;
  currentBowlerId: string | null;
  
  bowlerStats: Record<string, BowlerStats>;
  batterStats: Record<string, BatterStats>;
  
  extras: {
    wd: number;
    nb: number;
    b: number;
    lb: number;
    total: number;
  };

  isAllOut: boolean;
  isInningsComplete: boolean;
  
  targetScore?: number;
  runsNeeded?: number;
  ballsRemaining?: number;
  isTargetReached?: boolean;
}

export function getMatchStatus(
  events: BallEvent[],
  config: ScoringEngineConfig,
  targetScore?: number
): DerivedMatchState {
  const state: DerivedMatchState = {
    totalRuns: 0,
    totalWickets: 0,
    validBalls: 0,
    currentOver: 0,
    currentBall: 0,
    currentStrikerId: null,
    currentNonStrikerId: null,
    currentBowlerId: null,
    bowlerStats: {},
    batterStats: {},
    extras: { wd: 0, nb: 0, b: 0, lb: 0, total: 0 },
    isAllOut: false,
    isInningsComplete: false,
    targetScore,
  };

  if (targetScore) {
    state.runsNeeded = targetScore;
    state.ballsRemaining = (config.oversPerInnings ?? 20) * 6;
    state.isTargetReached = false;
  }

  // To track maidens correctly we need to know runs off the bat + wides/no-balls off the bowler in the current over
  let currentOverRunsForBowler = 0;
  let ballsInCurrentOver = 0;

  for (const event of events) {
    if (!event) continue;

    // Initialize stats
    if (!state.bowlerStats[event.bowlerId]) {
      state.bowlerStats[event.bowlerId] = { validBalls: 0, runs: 0, wickets: 0, maidens: 0 };
    }
    if (!state.batterStats[event.strikerId]) {
      state.batterStats[event.strikerId] = { runs: 0, ballsFaced: 0, fours: 0, sixes: 0 };
    }
    if (!state.batterStats[event.nonStrikerId]) {
      state.batterStats[event.nonStrikerId] = { runs: 0, ballsFaced: 0, fours: 0, sixes: 0 };
    }

    const bowlerStat = state.bowlerStats[event.bowlerId]!;
    const batterStat = state.batterStats[event.strikerId]!;

    // Determine correctness of ball
    const isWide = event.deliveryType === 'wide';
    const isNoBall = event.deliveryType === 'no-ball';
    const isLegal = !isWide && !isNoBall;

    // ----- RUNS -----
    const ballTotalRuns = event.runs.bat + event.runs.extra + (event.runs.penalty || 0);
    state.totalRuns += ballTotalRuns;
    
    if (event.runs.extra > 0) {
      state.extras.total += event.runs.extra;
      if (isWide) state.extras.wd += event.runs.extra;
      else if (isNoBall) state.extras.nb += event.runs.extra;
      else if (event.deliveryType === 'bye') state.extras.b += event.runs.extra;
      else if (event.deliveryType === 'leg-bye') state.extras.lb += event.runs.extra;
    }

    batterStat.runs += event.runs.bat;
    if (isLegal || isNoBall) {
       // Wide balls do not count as a ball faced for the batter mathematically, usually, but sometimes tracked. 
       // Standard: no-balls count as ball faced, wides do not.
       batterStat.ballsFaced += 1;
    }
    if (event.runs.bat === 4) batterStat.fours += 1;
    if (event.runs.bat === 6) batterStat.sixes += 1;

    // Bowler runs runs increment for bat + wides + no balls. Byes and leg byes do NOT count against the bowler.
    let runsAgainstBowler = event.runs.bat;
    if (isWide || isNoBall) {
        runsAgainstBowler += event.runs.extra;
    }
    bowlerStat.runs += runsAgainstBowler;
    currentOverRunsForBowler += runsAgainstBowler;

    // ----- WICKETS -----
    if (event.wicket) {
      state.totalWickets += 1;
      
      // Does it count to the bowler? Bowled, Caught, LBW, Stumped, Hit Wicket.
      const bowlerWickets = ['bowled', 'caught', 'lbw', 'stumped', 'hit wicket'];
      if (bowlerWickets.includes(event.wicket.type)) {
        bowlerStat.wickets += 1;
      }
    }

    // ----- BALL COUNT & OVERS -----
    if (isLegal) {
      state.validBalls += 1;
      bowlerStat.validBalls += 1;
      state.currentBall = state.validBalls % 6;
      state.currentOver = Math.floor(state.validBalls / 6);
      ballsInCurrentOver += 1;
      if (targetScore) state.ballsRemaining! -= 1;
    }

    const isEndOfOver = isLegal && state.currentBall === 0 && state.validBalls > 0;
    
    // Check Maiden over
    if (isEndOfOver) {
      if (currentOverRunsForBowler === 0) {
        bowlerStat.maidens += 1;
      }
      currentOverRunsForBowler = 0;
      ballsInCurrentOver = 0;
    }

    if (targetScore) {
      state.runsNeeded = targetScore - state.totalRuns;
      if (state.totalRuns >= targetScore) {
        state.isTargetReached = true;
      }
    }

    // ----- STRIKE ROTATION -----
    state.currentStrikerId = event.strikerId;
    state.currentNonStrikerId = event.nonStrikerId;
    state.currentBowlerId = event.bowlerId;
    
    // Determine who is on strike next based on the event or physical rules.
    // Physical rules: 1, 3, 5 runs rotates strike (bat + byes/leg-byes/wides that were physically run)
    const physicalRuns = event.runs.bat + (
      ['bye', 'leg-bye', 'wide'].includes(event.deliveryType) ? event.runs.extra - (isWide ? 1 : 0) : 0
    ) + (isNoBall ? event.runs.extra - 1 : 0);

    let rotateStrike = physicalRuns % 2 !== 0;

    // Wicket at the non-striker's end might keep strike, but wicket on last ball etc.
    // The "isStrikeRotated" flag in BallEvent can be an explicit override/indicator
    if (event.isStrikeRotated !== undefined) {
      rotateStrike = event.isStrikeRotated;
    }

    // New 2022 rule: When a batter is caught, the new batter comes to the striker's end regardless of crossing.
    // Unless it's the end of an over.
    if (event.wicket && event.wicket.type === 'caught') {
      rotateStrike = false; 
    }

    // If it's a run out, the one who wasn't dismissed stays at their end.
    // Handled by the explicit `isStrikeRotated` flag, or we can assume `rotateStrike` handles it correctly if explicitly set.

    if (rotateStrike) {
      const temp = state.currentStrikerId;
      state.currentStrikerId = state.currentNonStrikerId;
      state.currentNonStrikerId = temp;
    }

    // Over ends: rotate again!
    // But if a wicket falls on the last ball, it depends on whether they crossed (now mostly irrelevant for caught, but relevant for run out). 
    // Standard cricket: strike ALWAYS rotates at the end of an over.
    if (isEndOfOver) {
      const temp = state.currentStrikerId;
      state.currentStrikerId = state.currentNonStrikerId;
      state.currentNonStrikerId = temp;
      
      state.currentBowlerId = null; // Needs a new bowler
    }
    
    // If a wicket fell, the dismissed batter is removed from strike.
    // The UI must prompt for a new batter. We set the dismissed player's ID to null
    if (event.wicket) {
      if (event.wicket.dismissedId === state.currentStrikerId) {
        state.currentStrikerId = null;
      } else if (event.wicket.dismissedId === state.currentNonStrikerId) {
        state.currentNonStrikerId = null;
      }
    }
  }

  // Final check for match/innings completion
  state.isAllOut = state.totalWickets >= (config.wicketsPerInnings || 10);
  
  const reachedOversLimit = state.currentOver >= (config.oversPerInnings ?? 20);
  state.isInningsComplete = state.isAllOut || reachedOversLimit || (state.isTargetReached ?? false);

  return state;
}
