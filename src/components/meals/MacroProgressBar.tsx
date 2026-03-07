interface MacroProgressBarProps {
  label: string;
  current: number;
  target: number;
  colorToken: string; // CSS var, e.g. "--metric-protein"
}

const MacroProgressBar = ({ label, current, target, colorToken }: MacroProgressBarProps) => {
  const progress = Math.min((current / target) * 100, 100);
  const color = `hsl(var(${colorToken}))`;

  return (
    <div className="flex-1 text-center space-y-1.5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden mx-2">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${progress}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-xs font-bold" style={{ color }}>
        {Math.round(current)}
        <span className="text-muted-foreground font-normal">/{target}g</span>
      </p>
    </div>
  );
};

export default MacroProgressBar;
