import { useCallback, useEffect, useRef, useState } from 'react';
import type { PickerMode } from '@crichead/core';

interface UseOverCompletionFlowInput {
  ballsLength: number;
  currentOver: number;
  currentBall: number;
  isMatchFinished: boolean;
  pickerMode: PickerMode;
  sessionSetPickerMode: (mode: PickerMode) => void;
  strikerId: string | null;
  nonStrikerId: string | null;
  bowlerId: string | null;
}

export function useOverCompletionFlow({
  ballsLength,
  currentOver,
  currentBall,
  isMatchFinished,
  pickerMode,
  sessionSetPickerMode,
  strikerId,
  nonStrikerId,
  bowlerId,
}: UseOverCompletionFlowInput) {
  const [showOverCompleteModal, setShowOverCompleteModal] = useState(false);
  const [isAwaitingNextOverConfirmation, setIsAwaitingNextOverConfirmation] = useState(false);

  const prevBallsLenRef = useRef(ballsLength);
  const prevOverRef = useRef(currentOver);

  useEffect(() => {
    const prevLen = prevBallsLenRef.current;

    if (ballsLength <= prevLen) {
      prevBallsLenRef.current = ballsLength;
      prevOverRef.current = currentOver;
      return;
    }

    const prevOver = prevOverRef.current;

    prevBallsLenRef.current = ballsLength;
    prevOverRef.current = currentOver;

    const overChanged = currentOver > prevOver;
    const isEndOfOver = currentBall === 0;

    if (overChanged && isEndOfOver) {
      if (pickerMode !== null) {
        sessionSetPickerMode(null);
      }
      setIsAwaitingNextOverConfirmation(true);
      setShowOverCompleteModal(true);
      return;
    }

    if (currentBall > 0) {
      setIsAwaitingNextOverConfirmation(false);
    }
  }, [ballsLength, currentBall, currentOver, pickerMode, sessionSetPickerMode]);

  const handleStartNextOver = useCallback(() => {
    sessionSetPickerMode(null);
    setIsAwaitingNextOverConfirmation(false);
    setShowOverCompleteModal(false);
  }, [sessionSetPickerMode]);

  const resetOverCompletionFlow = useCallback(() => {
    setIsAwaitingNextOverConfirmation(false);
    setShowOverCompleteModal(false);
  }, []);

  const prevMatchFinishedRef = useRef(false);
  useEffect(() => {
    if (isMatchFinished && !prevMatchFinishedRef.current) {
      setShowOverCompleteModal(true);
    }
    prevMatchFinishedRef.current = isMatchFinished;
  }, [isMatchFinished]);

  useEffect(() => {
    if (
      isAwaitingNextOverConfirmation &&
      !showOverCompleteModal &&
      strikerId !== null &&
      nonStrikerId !== null &&
      bowlerId !== null
    ) {
      setIsAwaitingNextOverConfirmation(false);
    }
  }, [
    isAwaitingNextOverConfirmation,
    showOverCompleteModal,
    strikerId,
    nonStrikerId,
    bowlerId,
  ]);

  const isOverCompleteWaiting = isAwaitingNextOverConfirmation && !showOverCompleteModal;

  return {
    showOverCompleteModal,
    setShowOverCompleteModal,
    isOverCompleteWaiting,
    handleStartNextOver,
    resetOverCompletionFlow,
  };
}
