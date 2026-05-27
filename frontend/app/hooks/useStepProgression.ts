import { useCallback, useState } from "react";

/**
 * 多ステップフォーム (ShopEditPage / 将来 ShopCreate) の
 * - currentStep
 * - completedSteps (Set)
 * - next / prev / goTo ハンドラ
 * - computeProgress(filledFlags): filled + completedSteps から進捗率を算出
 * を集約する hook。
 *
 * 進捗率の元になる filledFlags は呼び出し側が各 step の必須 field が
 * 埋まっているかを配列で渡す関数 computeProgress に渡す。
 * 呼び出し側が任意のタイミングで計算できるので、hook 順序の制約を
 * 受けない (form state を上で先に hooks 経由で持つ必要が無い)。
 */
export interface UseStepProgressionResult {
  currentStep: number;
  completedSteps: Set<number>;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  /** filledFlags: 各 step の必須が埋まっているか。stepCount に合わせた長さ */
  computeProgress: (filledFlags: boolean[]) => { progress: number; visitedSet: Set<number> };
}

export function useStepProgression(
  stepCount: number,
  initialStep = 0,
): UseStepProgressionResult {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const next = useCallback(() => {
    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    if (currentStep < stepCount - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, stepCount]);

  const prev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const goTo = useCallback((index: number) => {
    setCurrentStep(index);
  }, []);

  const computeProgress = useCallback(
    (filledFlags: boolean[]) => {
      const visitedSet = new Set<number>([
        ...Array.from(completedSteps),
        ...filledFlags.map((f, i) => (f ? i : -1)).filter((i) => i >= 0),
      ]);
      const progress = stepCount > 0
        ? Math.round((visitedSet.size / stepCount) * 100)
        : 0;
      return { progress, visitedSet };
    },
    [completedSteps, stepCount],
  );

  return { currentStep, completedSteps, next, prev, goTo, computeProgress };
}
