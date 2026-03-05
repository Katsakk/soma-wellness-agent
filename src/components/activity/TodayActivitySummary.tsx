import { Card, CardContent } from "@/components/ui/card";
import { Flame, Clock, Dumbbell, Timer } from "lucide-react";

interface Workout {
  id: string;
  name: string;
  workout_type: string | null;
  duration: number | null;
  calories_burned: number | null;
  completed_at: string | null;
  created_at: string;
}

interface TodayActivitySummaryProps {
  workouts: Workout[];
}

const TodayActivitySummary = ({ workouts }: TodayActivitySummaryProps) => {
  const totalCalories = workouts.reduce((s, w) => s + (w.calories_burned || 0), 0);
  const totalDuration = workouts.reduce((s, w) => s + (w.duration || 0), 0);
  const workoutCount = workouts.length;

  // Gauge config — matches CalorieGauge pattern
  const target = 500; // daily burn target
  const progress = Math.min(totalCalories / target, 1);
  const size = 220;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2 - 10;
  const center = size / 2;
  const startAngle = 120;
  const sweepAngle = 300;
  const endAngle = startAngle + sweepAngle;

  const polarToCartesian = (angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: center + radius * Math.cos(rad), y: center + radius * Math.sin(rad) };
  };

  const describeArc = (start: number, end: number) => {
    const s = polarToCartesian(start);
    const e = polarToCartesian(end);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  const progressAngle = startAngle + sweepAngle * progress;

  // Workout type breakdown
  const typeMap: Record<string, { label: string; emoji: string }> = {
    cardio: { label: "Cardio", emoji: "🏃" },
    strength: { label: "Strength", emoji: "💪" },
    flexibility: { label: "Flexibility", emoji: "🧘" },
    sports: { label: "Sports", emoji: "⚽" },
    hiit: { label: "HIIT", emoji: "🔥" },
    other: { label: "General", emoji: "🏋️" },
  };

  const typeCounts = workouts.reduce<Record<string, number>>((acc, w) => {
    const type = w.workout_type || "other";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Burn gauge + stats */}
      <Card>
        <CardContent className="pt-6 pb-4 space-y-2">
          <div className="flex flex-col items-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <path
                d={describeArc(startAngle, endAngle)}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
              {progress > 0.01 && (
                <path
                  d={describeArc(startAngle, progressAngle)}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                />
              )}
              <g transform={`translate(${center}, ${center})`}>
                <g transform="translate(-12, -46)">
                  <Flame
                    width={24}
                    height={24}
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    opacity={0.85}
                  />
                </g>
                <text
                  textAnchor="middle"
                  y={0}
                  className="fill-foreground"
                  style={{ fontSize: "36px", fontWeight: 700 }}
                >
                  {totalCalories}
                </text>
                <text
                  textAnchor="middle"
                  y={18}
                  className="fill-muted-foreground"
                  style={{ fontSize: "12px" }}
                >
                  Burned
                </text>
              </g>
              {(() => {
                const endPos = polarToCartesian(endAngle);
                return (
                  <text
                    x={endPos.x + 14}
                    y={endPos.y + 4}
                    className="fill-muted-foreground"
                    style={{ fontSize: "11px", fontWeight: 500 }}
                  >
                    {target.toLocaleString()}
                  </text>
                );
              })()}
            </svg>
          </div>

          {/* Duration & count bars */}
          <div className="flex items-center gap-0 pt-2">
            <StatBar
              icon={Timer}
              label="Duration"
              value={`${totalDuration} min`}
              color="bg-primary"
              progress={Math.min(totalDuration / 60, 1)}
            />
            <StatBar
              icon={Dumbbell}
              label="Workouts"
              value={`${workoutCount}`}
              color="bg-accent-foreground"
              progress={Math.min(workoutCount / 3, 1)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Type breakdown chips */}
      {Object.keys(typeCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(typeCounts).map(([type, count]) => {
            const info = typeMap[type] || typeMap.other;
            return (
              <div
                key={type}
                className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium"
              >
                <span>{info.emoji}</span>
                <span>{info.label}</span>
                <span className="text-muted-foreground">×{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

function StatBar({
  icon: Icon,
  label,
  value,
  color,
  progress,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
  progress: number;
}) {
  return (
    <div className="flex-1 px-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <Icon className="h-3 w-3 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">{label}</span>
        </div>
        <span className="text-[11px] font-semibold">{value}</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${Math.max(progress * 100, 2)}%` }}
        />
      </div>
    </div>
  );
}

export default TodayActivitySummary;
