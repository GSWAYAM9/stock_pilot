import { TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface KpiCardProps {
  label: string;
  value: number;
  formatValue: (n: number) => string;
  subtitle: string;
  deltaPct: number;
  sparkline: number[];
  accentColor?: string;
  invertDelta?: boolean;
  onClick?: () => void;
}

export function KpiCard({
  label,
  value,
  formatValue,
  subtitle,
  deltaPct,
  sparkline,
  accentColor = '#4f46e5',
  invertDelta = false,
  onClick,
}: KpiCardProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(0);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    const start = prevValueRef.current;
    const end = value;
    const duration = 380;
    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayValue(start + (end - start) * eased);
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        prevValueRef.current = end;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value]);

  const isPositive = deltaPct >= 0;
  const isGood = invertDelta ? !isPositive : isPositive;
  const chartData = sparkline.map((v, i) => ({ i, v }));
  const gradId = `spark-${label.replace(/[^a-z0-9]/gi, '')}`;

  const content = (
    <div className="flex h-full flex-col justify-between gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--text-muted)] truncate">{label}</span>
        <span
          className={`inline-flex items-center gap-0.5 font-mono text-[11px] font-medium tabular-nums shrink-0 ${
            isGood
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {isPositive ? '+' : ''}
          {deltaPct}%
        </span>
      </div>

      <div className="font-mono text-[22px] leading-tight font-bold tracking-tight text-[var(--text-primary)] tabular-nums whitespace-nowrap">
        {formatValue(displayValue)}
      </div>

      <div className="flex items-end justify-between gap-2">
        <span className="text-[11px] leading-snug text-[var(--text-muted)] truncate">
          {subtitle}
        </span>

        <div className="h-7 w-16 shrink-0" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 2, right: 1, bottom: 1, left: 1 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentColor} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={accentColor}
                strokeWidth={1.75}
                fill={`url(#${gradId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 text-left transition-colors hover:border-[var(--border-strong)] cursor-pointer"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4">
      {content}
    </div>
  );
}
