import { Flame } from "lucide-react";

interface CalorieGaugeProps {
  consumed: number;
  target: number;
}

const CalorieGauge = ({ consumed, target }: CalorieGaugeProps) => {
  const remaining = Math.max(0, target - consumed);
  const progress = Math.min(consumed / target, 1);

  const size = 240;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2 - 16;
  const center = size / 2;

  // Arc from 120° to 420° (300° sweep) — gap at bottom
  const startAngle = 120;
  const sweepAngle = 300;
  const endAngle = startAngle + sweepAngle;

  const polarToCartesian = (angle: number) => {
    const rad = (angle - 90) * Math.PI / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad)
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
          strokeLinecap="round" />
        
        {/* Progress arc */}
        {progress > 0.01 &&
        <path
          d={describeArc(startAngle, progressAngle)}
          fill="none"
          stroke="hsl(var(--warning))"
          strokeWidth={strokeWidth}
          strokeLinecap="round" />
        }
        {/* Center content */}
        <g transform={`translate(${center}, ${center})`}>
          <g transform="translate(-12, -50)">
            <Flame
              width={24}
              height={24}
              stroke="hsl(var(--warning))"
              fill="hsl(var(--warning))"
              opacity={0.85} />
          </g>
          <text
            textAnchor="middle"
            y={-4}
            className="fill-foreground"
            style={{ fontSize: "36px", fontWeight: 700 }}>
            {consumed}
          </text>
          <text
            textAnchor="middle"
            y={16}
            className="fill-muted-foreground"
            style={{ fontSize: "12px" }}>
            Consumed
          </text>
        </g>
        {/* Target label */}
        {(() => {
          const endPos = polarToCartesian(endAngle);
          return (
            <text
              x={endPos.x + 8}
              y={endPos.y + 4}
              className="fill-muted-foreground"
              style={{ fontSize: "11px", fontWeight: 500 }}>
              {target.toLocaleString()}
            </text>);
        })()}
      </svg>
    </div>);

};

export default CalorieGauge;