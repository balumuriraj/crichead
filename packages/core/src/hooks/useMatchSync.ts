import { useState, useEffect, useCallback, useRef } from 'react';
import {
  onSnapshot,
  doc,
  collection,
  runTransaction,
  query,
  orderBy,
  serverTimestamp,
  getDocs,
  limit,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/client';
import type { BallEvent } from '../schema/ballEvent';
import type { FirestoreMatchDoc } from '../types/Firestore';

export interface UseMatchSyncOptions {
  /** Subscribe to balls for the current innings. Default: false */
  subscribeToBalls?: boolean;
}

export interface UseMatchSyncReturn {
  /** The match document data, or null if not yet loaded */
  match: FirestoreMatchDoc | null;
  /** Balls for the current innings (only populated if subscribeToBalls is true) */
  currentInningsBalls: BallEvent[];
  /** Whether the initial snapshot is still loading */
  loading: boolean;
  /** Error from snapshot listener or transaction, null if none */
  error: Error | null;
  /** Add a ball to the current innings atomically */
  addBallToMatch: (ball: BallEvent) => Promise<void>;
  
  /** Manually trigger the end of the current innings (transitions to 2nd innings or finishes match) */
  /** Manually trigger the end of the current innings (transitions to 2nd innings or finishes match) */
  endCurrentInnings: () => Promise<void>;
  
  /** Undo the most recently added ball in the current innings */
  undoLastBallFromMatch: () => Promise<void>;
}

export function useMatchSync(
  matchId: string | null,
  options: UseMatchSyncOptions = {}
): UseMatchSyncReturn {
  const { subscribeToBalls = false } = options;

  const [match, setMatch] = useState<FirestoreMatchDoc | null>(null);
  const [currentInningsBalls, setCurrentInningsBalls] = useState<BallEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Subscribe to match document
  useEffect(() => {
    if (!matchId) {
      setMatch(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const db = getFirebaseDb();
    const matchDocRef = doc(db, 'matches', matchId);

    const unsubscribe = onSnapshot(
      matchDocRef,
      (snapshot) => {
        if (!mountedRef.current) return;

        if (snapshot.exists()) {
          const data = snapshot.data() as Omit<FirestoreMatchDoc, 'id'>;
          setMatch({ ...data, id: snapshot.id });
        } else {
          setMatch(null);
          setError(new Error(`Match ${matchId} not found`));
        }
        setLoading(false);
      },
      (err) => {
        if (!mountedRef.current) return;
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [matchId]);

  // Subscribe to current innings balls (optional)
  const currentInningsIndex = match?.currentInningsIndex;
  useEffect(() => {
    if (!matchId || !subscribeToBalls || currentInningsIndex === undefined) {
      setCurrentInningsBalls([]);
      return;
    }

    const db = getFirebaseDb();
    const ballsRef = collection(
      db,
      'matches',
      matchId,
      'innings',
      String(currentInningsIndex),
      'balls'
    );
    const ballsQuery = query(ballsRef, orderBy('sequence', 'asc'));

    const unsubscribe = onSnapshot(
      ballsQuery,
      (snapshot) => {
        if (!mountedRef.current) return;

        const balls: BallEvent[] = snapshot.docs.map((d) => d.data() as BallEvent);
        setCurrentInningsBalls(balls);
      },
      (err) => {
        if (!mountedRef.current) return;
        setError(err);
      }
    );

    return () => unsubscribe();
  }, [matchId, subscribeToBalls, currentInningsIndex]);

  // addBallToMatch transaction
  const addBallToMatch = useCallback(
    async (ball: BallEvent): Promise<void> => {
      if (!matchId) {
        throw new Error('No matchId provided');
      }

      const db = getFirebaseDb();
      const matchDocRef = doc(db, 'matches', matchId);

      try {
        await runTransaction(db, async (transaction) => {
          const matchSnap = await transaction.get(matchDocRef);

          if (!matchSnap.exists()) {
            throw new Error(`Match ${matchId} not found`);
          }

          const matchData = matchSnap.data() as Omit<FirestoreMatchDoc, 'id'>;

          if (matchData.status !== 'live') {
            throw new Error(
              `Cannot add ball: match status is '${matchData.status}'`
            );
          }

          if (!matchData.innings || matchData.innings.length === 0) {
            throw new Error('No innings found on match');
          }

          const inningsIndex = matchData.currentInningsIndex;
          const currentInnings = matchData.innings[inningsIndex];

          if (!currentInnings) {
            throw new Error(`Innings at index ${inningsIndex} not found`);
          }

          // Add ball to subcollection
          const ballDocRef = doc(
            collection(
              db,
              'matches',
              matchId,
              'innings',
              String(inningsIndex),
              'balls'
            ),
            ball.id
          );

          transaction.set(ballDocRef, {
            ...ball,
            sequence: currentInnings.ballCount,
            timestamp: serverTimestamp(),
          });

          // Note: In the new Event-Stream architecture, the `getMatchStatus` engine derives
          // totalRuns, totalWickets, and overs natively from the list of events.
          // However, we still increment the high-level match fields here so that listeners looking
          // purely at the `match` document (e.g., match lists) can show live preview scores.
          const newTotalRuns = currentInnings.totalRuns + ball.runs.bat + ball.runs.extra + (ball.runs.penalty || 0);
          const newTotalWickets = currentInnings.totalWickets + (ball.wicket ? 1 : 0);
          const newBallCount = currentInnings.ballCount + 1;
          
          let newOvers = currentInnings.overs;
          const isLegal = ball.deliveryType === 'legal' || ball.deliveryType === 'bye' || ball.deliveryType === 'leg-bye';
          if (isLegal) {
             const over = Math.floor(currentInnings.overs);
             const subBall = Math.round((currentInnings.overs - over) * 10);
             const nextBalls = subBall + 1;
             newOvers = nextBalls === 6 ? over + 1 : over + (nextBalls / 10);
          }

          // Update match document innings summary
          const updatedInnings = [...matchData.innings];
          updatedInnings[inningsIndex] = {
            ...currentInnings,
            totalRuns: newTotalRuns,
            totalWickets: newTotalWickets,
            overs: newOvers,
            ballCount: newBallCount,
          };

          const updatePayload: Record<string, unknown> = {
            innings: updatedInnings,
          };

          // Check if chasing team has exceeded target (second innings only)
          if (inningsIndex === 1) {
            const firstInningsRuns = matchData.innings[0]?.totalRuns ?? 0;
            if (newTotalRuns > firstInningsRuns) {
              // Chasing team wins — match finished
              updatePayload.status = 'finished';
            }
          }

          transaction.update(matchDocRef, updatePayload);
        });
      } catch (err) {
        const txError =
          err instanceof Error ? err : new Error(String(err));
        if (mountedRef.current) {
          setError(txError);
        }
        throw txError;
      }
    },
    [matchId]
  );

  const endCurrentInnings = useCallback(async () => {
    if (!matchId) {
      throw new Error('No matchId provided');
    }

    const db = getFirebaseDb();
    const matchDocRef = doc(db, 'matches', matchId);

    try {
      await runTransaction(db, async (transaction) => {
        const matchSnap = await transaction.get(matchDocRef);
        if (!matchSnap.exists()) {
          throw new Error(`Match ${matchId} not found`);
        }

        const matchData = matchSnap.data() as Omit<FirestoreMatchDoc, 'id'>;
        if (matchData.status !== 'live') {
          return;
        }

        const inningsIndex = matchData.currentInningsIndex;
        const currentInnings = matchData.innings[inningsIndex];

        if (!currentInnings) {
          throw new Error(`Innings at index ${inningsIndex} not found`);
        }

        const updatePayload: Record<string, unknown> = {};
        const updatedInnings = [...matchData.innings];

        const isFirstInnings = inningsIndex === 0;
        if (isFirstInnings) {
          // Transition to second innings
          const secondBattingTeamId =
            currentInnings.teamId === matchData.teamA
              ? matchData.teamB
              : matchData.teamA;

          updatedInnings.push({
            teamId: secondBattingTeamId,
            totalRuns: 0,
            totalWickets: 0,
            overs: 0,
            ballCount: 0,
          });

          updatePayload.innings = updatedInnings;
          updatePayload.currentInningsIndex = 1;
        } else {
          // Second innings ended — match is finished
          updatePayload.status = 'finished';
        }

        transaction.update(matchDocRef, updatePayload);
      });
    } catch (err) {
      const txError = err instanceof Error ? err : new Error(String(err));
      if (mountedRef.current) {
        setError(txError);
      }
      throw txError;
    }
  }, [matchId]);

  const undoLastBallFromMatch = useCallback(async (): Promise<void> => {
    if (!matchId) {
      throw new Error('No matchId provided');
    }

    const db = getFirebaseDb();
    const matchDocRef = doc(db, 'matches', matchId);

    try {
      // First, get the current match data to find the current innings
      const matchSnap = await getDocs(query(collection(db, 'matches'), limit(1))); // We just need innings index, but we can do it safer
      // Wait, we can just get the match doc directly but we're in a hook where we already have `match`.
      // However, to avoid race conditions, let's just use the transaction to get the match, but we need the last ball ID first.
      
      // Let's get the match snapshot to know the inningsIndex
      let inningsIndex = match?.currentInningsIndex;
      if (inningsIndex === undefined) {
         // Query match manually if the hook state is stale
         return; // We rely on the hook's `match` state to be populated
      }
      
      const ballsRef = collection(db, 'matches', matchId, 'innings', String(inningsIndex), 'balls');
      const latestBallQuery = query(ballsRef, orderBy('sequence', 'desc'), limit(1));
      const latestBallSnap = await getDocs(latestBallQuery);
      
      if (latestBallSnap.empty || latestBallSnap.docs.length === 0) {
        return; // No balls to undo
      }
      
      const lastBallDoc = latestBallSnap.docs[0];
      if (!lastBallDoc) return;
      const lastBallData = lastBallDoc.data();
      const ballId = lastBallDoc.id;

      await runTransaction(db, async (transaction) => {
        const txMatchSnap = await transaction.get(matchDocRef);
        if (!txMatchSnap.exists()) {
          throw new Error(`Match ${matchId} not found`);
        }

        const matchData = txMatchSnap.data() as Omit<FirestoreMatchDoc, 'id'>;
        if (matchData.status !== 'live' && matchData.status !== 'finished') {
          throw new Error(`Cannot undo ball: match status is '${matchData.status}'`);
        }
        if (matchData.status === 'finished' && inningsIndex !== 1) {
           throw new Error(`Cannot undo ball: match status is finished`);
        }

        const currentInnings = matchData.innings[inningsIndex];
        if (!currentInnings || currentInnings.ballCount === 0) {
          return; // nothing to undo
        }

        // Verify sequence to prevent race conditions
        if (lastBallData.sequence !== currentInnings.ballCount - 1) {
          throw new Error('Ball count mismatch: another device may have scored.');
        }

        const newTotalRuns = Math.max(0, currentInnings.totalRuns - (lastBallData.runs.bat + lastBallData.runs.extra + (lastBallData.runs.penalty || 0)));
        const newTotalWickets = Math.max(0, currentInnings.totalWickets - (lastBallData.wicket ? 1 : 0));
        const newBallCount = Math.max(0, currentInnings.ballCount - 1);

        let newOvers = currentInnings.overs;
        const isLegal = lastBallData.deliveryType === 'legal' || lastBallData.deliveryType === 'bye' || lastBallData.deliveryType === 'leg-bye';
        if (isLegal) {
             const over = Math.floor(currentInnings.overs);
             const subBall = Math.round((currentInnings.overs - over) * 10);
             if (subBall === 0 && over > 0) {
                 newOvers = (over - 1) + 0.5;
             } else {
                 newOvers = over + ((subBall - 1) / 10);
             }
        }

        // Delete the ball
        transaction.delete(doc(ballsRef, ballId));

        // Update match innings
        const updatedInnings = [...matchData.innings];
        updatedInnings[inningsIndex] = {
          ...currentInnings,
          totalRuns: newTotalRuns,
          totalWickets: newTotalWickets,
          overs: newOvers,
          ballCount: newBallCount,
        };

        const updatePayload: Record<string, unknown> = {
          innings: updatedInnings,
        };
        
        // If match was finished by this last ball, we must revert it to live
        if (matchData.status === 'finished') {
          updatePayload.status = 'live';
        }

        transaction.update(matchDocRef, updatePayload);
      });
    } catch (err) {
      const txError = err instanceof Error ? err : new Error(String(err));
      if (mountedRef.current) {
        setError(txError);
      }
      throw txError;
    }
  }, [matchId, match]);

  return {
    match,
    currentInningsBalls,
    loading,
    error,
    addBallToMatch,
    endCurrentInnings,
    undoLastBallFromMatch,
  };
}
