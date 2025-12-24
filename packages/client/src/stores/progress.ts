import { createSignal, createRoot, createEffect } from 'solid-js';
import type { InferenceRule } from '@turnstile/engine';

// Primitive rules that are always available
const PRIMITIVE_RULES: InferenceRule[] = [
  'assumption',
  'and_intro',
  'and_elim_l',
  'and_elim_r',
  'or_intro_l',
  'or_intro_r',
  'or_elim',
  'implies_intro',
  'implies_elim',
  'not_intro',
  'not_elim',
  'iff_intro',
  'iff_elim',
  'bottom_elim',
  'raa',
];

// Derived rules that can be unlocked (stored as strings, not part of InferenceRule yet)
const DERIVED_RULE_IDS = [
  'modus_tollens',
  'hypothetical_syllogism',
  'disjunctive_syllogism',
];

// Load progress from localStorage
const loadProgress = (): { unlockedRules: string[]; completedProblems: string[] } => {
  try {
    const stored = localStorage.getItem('turnstile-progress');
    if (stored) {
      return JSON.parse(stored) as { unlockedRules: string[]; completedProblems: string[] };
    }
  } catch {
    // Ignore parse errors
  }
  return {
    unlockedRules: [],
    completedProblems: [],
  };
};

// Save progress to localStorage
const saveProgress = (progress: { unlockedRules: string[]; completedProblems: string[] }) => {
  try {
    localStorage.setItem('turnstile-progress', JSON.stringify(progress));
  } catch {
    // Ignore write errors
  }
};

// Create global progress store
const createProgressStore = () => {
  const initial = loadProgress();
  const [unlockedRules, setUnlockedRulesInternal] = createSignal<Set<string>>(
    new Set(initial.unlockedRules)
  );
  const [completedProblems, setCompletedProblemsInternal] = createSignal<Set<string>>(
    new Set(initial.completedProblems)
  );

  // Auto-save when progress changes
  createEffect(() => {
    saveProgress({
      unlockedRules: Array.from(unlockedRules()),
      completedProblems: Array.from(completedProblems()),
    });
  });

  const unlockRule = (ruleId: string) => {
    setUnlockedRulesInternal((prev) => new Set([...prev, ruleId]));
  };

  const markProblemCompleted = (problemId: string) => {
    setCompletedProblemsInternal((prev) => new Set([...prev, problemId]));
  };

  const isProblemCompleted = (problemId: string) => {
    return completedProblems().has(problemId);
  };

  const isRuleUnlocked = (ruleId: string) => {
    // Primitive rules are always unlocked
    if (!DERIVED_RULE_IDS.includes(ruleId)) {
      return true;
    }
    return unlockedRules().has(ruleId);
  };

  const getAvailableRules = (): InferenceRule[] => {
    // For now, return only primitive rules
    // Derived rules would need to be added to the InferenceRule type
    return [...PRIMITIVE_RULES];
  };

  const resetProgress = () => {
    setUnlockedRulesInternal(new Set<string>());
    setCompletedProblemsInternal(new Set<string>());
  };

  return {
    unlockedRules,
    completedProblems,
    unlockRule,
    markProblemCompleted,
    isProblemCompleted,
    isRuleUnlocked,
    getAvailableRules,
    resetProgress,
  };
};

// Export singleton store
export const progressStore = createRoot(createProgressStore);
