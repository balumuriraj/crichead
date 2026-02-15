import { useState, useEffect, useCallback, useRef } from 'react';
import {
  onSnapshot,
  doc,
  collection,
  runTransaction,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/client';
import type { Ball } from '../types';
import type { FirestoreMatchDoc } from '../types/Firestore';
import { parseOvers } from '../utils/scoring';

export interface UseMatchSyncOptions {
  /** Subscribe to balls for the current innings. Default: false */
  subscribeToBalls?: boolean;
}

export interface UseMatchSyncReturn {
  /** The match document data, or null if not yet loaded */
  match: FirestoreMatchDoc | null;
  /** Balls for the current innings (only populated if subscribeToBalls is true) */
  currentInningsBalls: Ball[];
  /** Whether the initial snapshot is still loading */
  loading: boolean;
  /** Error from snapshot listener or transaction, null if none */
  error: Error | null;
  /** Add a ball to the current innings atomically */
  addBallToMatch: (ball: Ball) => Promise<void>;
}

export function useMatchSync(
  matchId: string | null,
  options: UseMatchSyncOptions = {}
): UseMatchSyncReturn {
  const { subscribeToBalls = false } = options;

  const [match, setMatch] = useState<FirestoreMatchDoc | null>(null);
  const [currentInningsBalls, setCurrentInningsBalls] = useState<Ball[]>([]);
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

        const balls: Ball[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            bowlerId: data.bowlerId,
            strikerId: data.strikerId,
            runs: data.runs,
            extras: data.extras ?? null,
            wicket: data.wicket ?? null,
            commentary: data.commentary,
          };
        });
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
    async (ball: Ball): Promise<void> => {
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

          // Calculate new stats incrementally (O(1))
          const newTotalRuns =
            currentInnings.totalRuns + ball.runs + (ball.extras?.runs ?? 0);
          const newTotalWickets =
            currentInnings.totalWickets + (ball.wicket ? 1 : 0);
          const newBallCount = currentInnings.ballCount + 1;

          const isValidDelivery =
            !ball.extras ||
            (ball.extras.type !== 'wd' && ball.extras.type !== 'nb');

          let newOvers = currentInnings.overs;
          if (isValidDelivery) {
            const { currentOver, currentBall } = parseOvers(
              currentInnings.overs
            );
            const totalValidBalls = currentOver * 6 + currentBall + 1;
            const nextOver = Math.floor(totalValidBalls / 6);
            const nextBall = totalValidBalls % 6;
            newOvers = parseFloat(`${nextOver}.${nextBall}`);
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
            )
          );

          transaction.set(ballDocRef, {
            ...ball,
            sequence: currentInnings.ballCount,
            timestamp: serverTimestamp(),
          });

          // Update match document innings summary
          const updatedInnings = [...matchData.innings];
          updatedInnings[inningsIndex] = {
            ...currentInnings,
            totalRuns: newTotalRuns,
            totalWickets: newTotalWickets,
            overs: newOvers,
            ballCount: newBallCount,
          };

          transaction.update(matchDocRef, { innings: updatedInnings });
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

  return {
    match,
    currentInningsBalls,
    loading,
    error,
    addBallToMatch,
  };
}
