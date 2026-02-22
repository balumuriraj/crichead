import { addDoc, collection, updateDoc, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { getFirebaseDb } from './client';
import type { MatchConfig, ScoringConfig, FirestoreInningsSummary } from '../../domain/types';
import type { BallEvent } from '../../domain/schema/ballEvent';
export interface QuickMatchConfig {
  teamAName: string;
  teamBName: string;
  oversPerInnings: number;
  ballsPerOver: number;
}

export async function createQuickMatch(config: QuickMatchConfig) {
  const db = getFirebaseDb();
  const docRef = await addDoc(collection(db, 'matches'), {
    teamA: config.teamAName,
    teamB: config.teamBName,
    status: 'upcoming',
    overs: config.oversPerInnings,
    ballsPerOver: config.ballsPerOver,
    createdAt: Date.now(),
    type: 'quick',
  });
}

export async function createMatch(matchData: Record<string, unknown>) {
  const db = getFirebaseDb();
  const docRef = await addDoc(collection(db, 'matches'), matchData);
  return docRef.id;
}

export interface MatchLiveStateUpdate {
  currentStrikerId?: string | null;
  currentNonStrikerId?: string | null;
  currentBowlerId?: string | null;
  status?: string;
}

export async function updateMatchState(matchId: string, stateUpdate: MatchLiveStateUpdate) {
  const db = getFirebaseDb();
  await updateDoc(doc(db, 'matches', matchId), stateUpdate as any);
}

export async function goLiveMatch(
  config: ScoringConfig, 
  inningsObj: FirestoreInningsSummary[], 
  matchStatus: string, 
  strikerId: string | null, 
  nonStrikerId: string | null, 
  bowlerId: string | null, 
  localCurrentInningsIndex: number, 
  localBalls: BallEvent[]
) {
  const db = getFirebaseDb();
  const ref = await addDoc(collection(db, 'matches'), {
    ...config,
    status: matchStatus,
    currentInningsIndex: localCurrentInningsIndex,
    innings: inningsObj,
    quickMatch: true,
    currentStrikerId: strikerId,
    currentNonStrikerId: nonStrikerId,
    currentBowlerId: bowlerId,
  });

  if (localBalls.length > 0) {
    const batch = writeBatch(db);
    const ballsRef = collection(db, 'matches', ref.id, 'innings', String(localCurrentInningsIndex), 'balls');
    localBalls.forEach((ball, idx) => {
      const ballDoc = doc(ballsRef);
      batch.set(ballDoc, {
        ...ball,
        sequence: idx,
        timestamp: serverTimestamp(),
      });
    });
    await batch.commit();
  }

  return ref.id;
}
