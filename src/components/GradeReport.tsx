import { score, type CaseResult, type CaseStatus } from '../lib/grade';
import { ratingText } from './controlStyles';

const ICON: Record<CaseStatus, string> = { pass: '✓', fail: '✗', error: '✗', timeout: '⏱' };
const warnText = ratingText.ok;

// Codility's report shape: the two scores up top, then every case, failing ones opened up
// with what went in, what was expected, and what came back.
export function GradeReport({ results }: { results: CaseResult[] }) {
  const s = score(results);
  return (
    <section aria-label="Test report" className="mt-2 rounded border border-zinc-200 p-3 text-xs dark:border-zinc-700">
      <p className="mb-2 text-sm font-medium">
        Correctness {s.correctness}% · Performance {s.performance}% · Total {s.total}% ({s.passed}/{s.count})
      </p>
      <ul className="space-y-1 font-mono">
        {results.map((r, i) => (
          <li key={i} className={r.status === 'pass' ? undefined : warnText}>
            {ICON[r.status]} {r.kind} · {r.name}
            {r.ms !== undefined && ` (${Math.round(r.ms)}ms)`}
            {r.status !== 'pass' && (
              <div className="whitespace-pre-wrap break-all pl-4 text-zinc-600 dark:text-zinc-400">
                {`input:    ${r.input}\nexpected: ${r.expected}\n${r.status === 'fail' ? `got:      ${r.got}` : r.detail}`}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
