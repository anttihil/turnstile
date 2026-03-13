import type { InferenceRule, ProvenTheorem } from '../types.js';
import type { Pattern } from './patterns.js';
import { Meta, PBottom, PNot, PAnd, POr, PImplies, PIff, formulaToPattern } from './patterns.js';

// ============================================================================
// Rule Schema Types
// ============================================================================

export type PremisePattern =
  | { type: 'line'; pattern: Pattern }
  | { type: 'subproof'; assumption: Pattern; conclusion: Pattern };

export interface RuleSchema {
  rule: InferenceRule;
  premises: PremisePattern[];
  conclusion: Pattern;
  orderFlexible: boolean;
}

// Shorthand helpers
const line = (pattern: Pattern): PremisePattern => ({ type: 'line', pattern });
const subproof = (assumption: Pattern, conclusion: Pattern): PremisePattern =>
  ({ type: 'subproof', assumption, conclusion });

// Metavariables
const A = Meta('A');
const B = Meta('B');
const C = Meta('C');

// ============================================================================
// Rule Schema Definitions
// ============================================================================

const RULE_SCHEMAS: RuleSchema[] = [
  // --- Conjunction ---
  {
    rule: 'and_intro',
    premises: [line(A), line(B)],
    conclusion: PAnd(A, B),
    orderFlexible: false,
  },
  {
    rule: 'and_elim_l',
    premises: [line(PAnd(A, B))],
    conclusion: A,
    orderFlexible: false,
  },
  {
    rule: 'and_elim_r',
    premises: [line(PAnd(A, B))],
    conclusion: B,
    orderFlexible: false,
  },

  // --- Disjunction ---
  {
    rule: 'or_intro_l',
    premises: [line(A)],
    conclusion: POr(A, B),
    orderFlexible: false,
  },
  {
    rule: 'or_intro_r',
    premises: [line(B)],
    conclusion: POr(A, B),
    orderFlexible: false,
  },
  {
    rule: 'or_elim',
    premises: [line(POr(A, B)), subproof(A, C), subproof(B, C)],
    conclusion: C,
    orderFlexible: false,
  },

  // --- Conditional ---
  {
    rule: 'implies_intro',
    premises: [subproof(A, B)],
    conclusion: PImplies(A, B),
    orderFlexible: false,
  },
  {
    rule: 'implies_elim',
    premises: [line(PImplies(A, B)), line(A)],
    conclusion: B,
    orderFlexible: true,
  },

  // --- Negation ---
  {
    rule: 'not_intro',
    premises: [subproof(A, PBottom)],
    conclusion: PNot(A),
    orderFlexible: false,
  },
  {
    rule: 'not_elim',
    premises: [line(PNot(PNot(A)))],
    conclusion: A,
    orderFlexible: false,
  },

  // --- Biconditional ---
  {
    rule: 'iff_intro',
    premises: [line(PImplies(A, B)), line(PImplies(B, A))],
    conclusion: PIff(A, B),
    orderFlexible: true,
  },
  // iff_elim: two modes (L→R and R→L)
  {
    rule: 'iff_elim',
    premises: [line(PIff(A, B)), line(A)],
    conclusion: B,
    orderFlexible: true,
  },
  {
    rule: 'iff_elim',
    premises: [line(PIff(A, B)), line(B)],
    conclusion: A,
    orderFlexible: true,
  },

  // --- Bottom ---
  {
    rule: 'bottom_elim',
    premises: [line(PBottom)],
    conclusion: A, // any formula
    orderFlexible: false,
  },

  // --- RAA ---
  {
    rule: 'raa',
    premises: [subproof(PNot(A), PBottom)],
    conclusion: A,
    orderFlexible: false,
  },
];

// ============================================================================
// Index by rule
// ============================================================================

export const SCHEMAS_BY_RULE: Map<InferenceRule, RuleSchema[]> = new Map();

for (const schema of RULE_SCHEMAS) {
  const existing = SCHEMAS_BY_RULE.get(schema.rule);
  if (existing) {
    existing.push(schema);
  } else {
    SCHEMAS_BY_RULE.set(schema.rule, [schema]);
  }
}

// ============================================================================
// Schema Registry
// ============================================================================

export interface SchemaEntry {
  id: string;
  schemas: RuleSchema[];
  enabled: boolean;
}

export type SchemaRegistry = Map<string, SchemaEntry>;

function theoremToSchema(theorem: ProvenTheorem): RuleSchema {
  return {
    rule: 'theorem',
    premises: theorem.premises.map((p) => line(formulaToPattern(p))),
    conclusion: formulaToPattern(theorem.conclusion),
    orderFlexible: false,
  };
}

export function buildSchemaRegistry(theorems: ProvenTheorem[] = []): SchemaRegistry {
  const registry: SchemaRegistry = new Map();
  for (const [rule, schemas] of SCHEMAS_BY_RULE) {
    registry.set(rule, { id: rule, schemas, enabled: true });
  }
  for (const theorem of theorems) {
    registry.set(theorem.id, {
      id: theorem.id,
      schemas: [theoremToSchema(theorem)],
      enabled: true,
    });
  }
  return registry;
}
