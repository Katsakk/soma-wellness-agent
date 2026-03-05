import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface SyncWorkoutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const integrations = [
  { id: "gmail", name: "Gmail", description: "Scan booking emails", logo: "/logos/gmail.svg" },
  { id: "strava", name: "Strava", description: "Import runs & rides", logo: "/logos/strava.svg" },
  { id: "oura", name: "Oura", description: "Sync ring activity", logo: "/logos/oura.png" },
];

const SyncWorkoutsDialog = ({ open, onOpenChange }: SyncWorkoutsDialogProps) => {
  const handleConnect = (id: string, name: string) => {
    toast.info(`${name} integration coming soon!`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Sync Workouts</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Connect a service to automatically import your workouts.
        </p>
        <div className="grid grid-cols-3 gap-3 pt-2">
          {integrations.map((int) => (
            <button
              key={int.id}
              onClick={() => handleConnect(int.id, int.name)}
              className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 hover:bg-muted transition-colors cursor-pointer"
            >
              <div className="rounded-lg bg-muted p-3">
                <img src={int.logo} alt={int.name} className="h-6 w-6 object-contain" />
              </div>
              <span className="text-xs font-medium">{int.name}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SyncWorkoutsDialog;
