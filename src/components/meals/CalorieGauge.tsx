import { Flame } from "lucide-react";

interface CalorieGaugeProps {
  consumed: number;
  target: number;
}

const CalorieGauge = ({ consumed, target }: CalorieGaugeProps) => {
  const remaining = Math.max(0, target - consumed);
  const progress = Math.min(consumed / target, 1);
  
  // SVG arc parameters
  const size = 200;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  
  // Arc from 150° to 390° (240° sweep)
  const startAngle = 150;
  const sweepAngle = 240;
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
      <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.85}`}>
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
        {/* Center content */}
        <g transform={`translate(${center}, ${center - 8})`}>
          <Flame
            x={-10}
            y={-28}
            width={20}
            height={20}
            className="text-warning"
            stroke="hsl(var(--warning))"
            fill="none"
          />
          <text
            textAnchor="middle"
            y={8}
            className="fill-foreground text-3xl font-bold"
            style={{ fontSize: "32px", fontWeight: 700 }}
          >
            {remaining}
          </text>
          <text
            textAnchor="middle"
            y={26}
            className="fill-muted-foreground"
            style={{ fontSize: "12px" }}
          >
            Remaining
          </text>
        </g>
      </svg>
    </div>
  );
};

export default CalorieGauge;
