/**
 * ProgressBar — visual progress indicator for quiz navigation.
 *
 * @author Zara Ibrahim, Frontend React Engineer — ArchitectAI
 */

interface ProgressBarProps {
  current: number;
  total: number;
  className?: string;
}

export default function ProgressBar({
  current,
  total,
  className = '',
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-300">
          Question {current} of {total}
        </span>
        <span className="text-slate-500">{percentage}%</span>
      </div>

      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Progress: question ${current} of ${total}`}
      >
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
