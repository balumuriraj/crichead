import { create } from 'zustand';
import { BallEvent, BallEventSchema } from '../schema/ballEvent';

export interface ScoringState {
  activeEvents: BallEvent[];
  redoStack: BallEvent[];
  
  // Actions
  setEvents: (events: BallEvent[]) => void;
  addEvent: (event: BallEvent) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
}

export const useScoringStore = create<ScoringState>((set) => ({
  activeEvents: [],
  redoStack: [],
  
  // Reset completely, usually on mount or when loading a new match
  reset: () => set({ activeEvents: [], redoStack: [] }),

  // Set initial events from the database
  setEvents: (events) => set({
    // Only keeping valid events according to schema
    activeEvents: events.filter(e => {
      const result = BallEventSchema.safeParse(e);
      if (!result.success) console.warn('Invalid BallEvent from DB:', result.error);
      return result.success;
    }),
    redoStack: [], // clearing redo stack on hard set
  }),

  // Add a new event (e.g. user scored a ball)
  addEvent: (event) => set((state) => {
    // Validate before adding
    const result = BallEventSchema.safeParse(event);
    if (!result.success) {
      console.error('Attempted to add invalid BallEvent:', result.error);
      return state;
    }
    
    return {
      activeEvents: [...state.activeEvents, result.data],
      // Any new action invalidates the redo future
      redoStack: [],
    };
  }),

  // Undo the last event
  undo: () => set((state) => {
    if (state.activeEvents.length === 0) return state; // Nothing to undo
    
    const newActive = [...state.activeEvents];
    const popped = newActive.pop()!;
    
    return {
      activeEvents: newActive,
      redoStack: [...state.redoStack, popped]
    };
  }),

  // Redo the last undone event
  redo: () => set((state) => {
    if (state.redoStack.length === 0) return state; // Nothing to redo
    
    const newRedo = [...state.redoStack];
    const popped = newRedo.pop()!;
    
    return {
      activeEvents: [...state.activeEvents, popped],
      redoStack: newRedo,
    };
  })
}));
