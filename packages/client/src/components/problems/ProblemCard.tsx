import type { Component } from 'solid-js';
import { printSequent } from '@turnstile/engine';
import type { Problem, DisplayMode } from '@turnstile/engine';
import { DifficultyBadge, Badge } from '../ui/Badge';

interface ProblemCardProps {
  problem: Problem;
  mode?: DisplayMode;
  completed?: boolean;
  onClick?: () => void;
}

export const ProblemCard: Component<ProblemCardProps> = (props) => {
  const mode = () => props.mode ?? 'utf8';

  return (
    <div
      class={`
        p-4 border rounded-lg cursor-pointer
        transition-all duration-200
        ${props.completed ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}
        hover:shadow-md hover:border-slate-300
      `}
      onClick={props.onClick}
    >
      <div class="flex items-start justify-between mb-2">
        <div class="flex gap-2 items-center">
          <DifficultyBadge level={props.problem.difficulty} />
          {props.problem.type === 'derivation' && (
            <Badge variant="info" size="sm">Derivation</Badge>
          )}
          {props.completed && (
            <Badge variant="success" size="sm">Completed</Badge>
          )}
        </div>
        <span class="text-xs text-slate-500">{props.problem.id}</span>
      </div>

      <div class="font-mono text-lg mb-2">
        {printSequent(props.problem.premises, props.problem.conclusion, mode())}
      </div>

      {props.problem.tags && props.problem.tags.length > 0 && (
        <div class="flex gap-1 flex-wrap">
          {props.problem.tags.map((tag) => (
            <span class="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
