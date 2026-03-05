interface MacroProgressBarProps {
  label: string;
  current: number;
  target: number;
  color: string; // tailwind color class e.g. "bg-primary"
}

const MacroProgressBar = ({ label, current, target, color }: MacroProgressBarProps) => {
  const progress = Math.min((current / target) * 100, 100);

  return (
    <div className="flex-1 text-center space-y-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden mx-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs font-semibold">
        {Math.round(current)}
        <span className="text-muted-foreground font-normal">/{target}g</span>
      </p>
    </div>
  );
};

export default MacroProgressBar;
