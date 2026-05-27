import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStepProgression } from "./useStepProgression";

describe("useStepProgression", () => {
  it("starts at step 0 by default", () => {
    const { result } = renderHook(() => useStepProgression(5));
    expect(result.current.currentStep).toBe(0);
    expect(result.current.completedSteps.size).toBe(0);
    expect(result.current.computeProgress([false, false, false, false, false]).progress).toBe(0);
  });

  it("starts at initialStep when provided", () => {
    const { result } = renderHook(() => useStepProgression(5, 2));
    expect(result.current.currentStep).toBe(2);
  });

  it("next marks current as completed and advances", () => {
    const { result } = renderHook(() => useStepProgression(3));
    act(() => result.current.next());
    expect(result.current.currentStep).toBe(1);
    expect(result.current.completedSteps.has(0)).toBe(true);
  });

  it("next does not advance past the last step but still marks it completed", () => {
    const { result } = renderHook(() => useStepProgression(3, 2));
    act(() => result.current.next());
    expect(result.current.currentStep).toBe(2);
    expect(result.current.completedSteps.has(2)).toBe(true);
  });

  it("prev decrements but not below 0", () => {
    const { result } = renderHook(() => useStepProgression(3, 1));
    act(() => result.current.prev());
    expect(result.current.currentStep).toBe(0);
    act(() => result.current.prev());
    expect(result.current.currentStep).toBe(0);
  });

  it("goTo jumps to arbitrary step", () => {
    const { result } = renderHook(() => useStepProgression(5));
    act(() => result.current.goTo(3));
    expect(result.current.currentStep).toBe(3);
  });

  it("computeProgress reflects filledFlags even without next clicks", () => {
    const { result } = renderHook(() => useStepProgression(4));
    const { progress, visitedSet } = result.current.computeProgress([true, false, true, false]);
    expect(progress).toBe(50);
    expect(visitedSet.has(0)).toBe(true);
    expect(visitedSet.has(2)).toBe(true);
    expect(visitedSet.has(1)).toBe(false);
  });

  it("computeProgress combines completedSteps and filledFlags", () => {
    const { result } = renderHook(() => useStepProgression(4));
    expect(result.current.computeProgress([true, false, false, false]).progress).toBe(25);
    act(() => result.current.next());
    act(() => result.current.next());
    // visited: {0, 1} (next で完了マーク) ∪ {0} (filled) = {0, 1}
    expect(result.current.computeProgress([true, false, false, false]).progress).toBe(50);
  });

  it("returns 0 progress for zero-step form", () => {
    const { result } = renderHook(() => useStepProgression(0));
    expect(result.current.computeProgress([]).progress).toBe(0);
  });
});
