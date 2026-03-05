import { Flame } from "lucide-react";

interface CalorieGaugeProps {
  consumed: number;
  target: number;
}

const CalorieGauge = ({ consumed, target }: CalorieGaugeProps) => {
  const remaining = Math.max(0, target - consumed);
  const progress = Math.min(consumed / target, 1);

  const size = 220;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2 - 10;
  const center = size / 2;

  // Arc from 100° to 440° (340° sweep) — nearly a full circle
  // Gap at bottom-left
  const startAngle = 100;
  const sweepAngle = 340;
  const endAngle = startAngle + sweepAngle;

  const polarToCartesian = (angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  const describeArc = (start: number, end: number) => {
    const s = polarToCartesian(start);
    const e = polarToCartesian(end);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  const progressAngle = startAngle + sweepAngle * progress;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background arc */}
        <path
          d={describeArc(startAngle, endAngle)}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        {progress > 0.01 && (
          <path
            d={describeArc(startAngle, progressAngle)}
            fill="none"
            stroke="hsl(var(--warning))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
        {/* Center content: icon above text */}
        <g transform={`translate(${center}, ${center})`}>
          {/* Fire icon */}
          <g transform="translate(-10, -38)">
            <Flame
              width={20}
              height={20}
              stroke="hsl(var(--warning))"
              fill="none"
            />
          </g>
          {/* Remaining number */}
          <text
            textAnchor="middle"
            y={2}
            className="fill-foreground"
            style={{ fontSize: "36px", fontWeight: 700 }}
          >
            {remaining}
          </text>
          {/* Label */}
          <text
            textAnchor="middle"
            y={20}
            className="fill-muted-foreground"
            style={{ fontSize: "12px" }}
          >
            Remaining
          </text>
        </g>
        {/* Target label at bottom */}
        <text
          textAnchor="middle"
          x={center}
          y={size - 4}
          className="fill-muted-foreground"
          style={{ fontSize: "11px" }}
        >
          Target: {target.toLocaleString()} kcal
        </text>
      </svg>
    </div>
  );
};

export default CalorieGauge;
