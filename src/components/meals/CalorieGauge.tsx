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
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-[10px]">
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
        {/* Center content: icon above text */}
        <g transform={`translate(${center}, ${center})`}>
          {/* Fire icon — positioned well above the number */}
          <g transform="translate(-12, -46)">
            <Flame
              width={24}
              height={24}
              stroke="hsl(var(--warning))"
              fill="hsl(var(--warning))"
              opacity={0.85} />
            
          </g>
          {/* Consumed number */}
          <text
            textAnchor="middle"
            y={0}
            className="fill-foreground"
            style={{ fontSize: "36px", fontWeight: 700 }}>
            
            {consumed}
          </text>
          {/* Label */}
          <text
            textAnchor="middle"
            y={18}
            className="fill-muted-foreground"
            style={{ fontSize: "12px" }}>
            
            Consumed
          </text>
        </g>
        {/* Target label at end of arc (right side) */}
        {(() => {
          const endPos = polarToCartesian(endAngle);
          return (
            <text
              x={endPos.x + 14}
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