import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, RefreshCw } from "lucide-react";
import { useGmailIntegration } from "@/hooks/useGmailIntegration";
import { toast } from "sonner";

interface SyncWorkoutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSynced?: () => void;
}

const SyncWorkoutsDialog = ({ open, onOpenChange, onSynced }: SyncWorkoutsDialogProps) => {
  const gmail = useGmailIntegration();

  const handleGmailClick = () => {
    if (gmail.status === "disconnected") {
      gmail.connect("/activity");
    } else if (gmail.status === "connected") {
      gmail.sync(() => { onSynced?.(); onOpenChange(false); });
    }
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
        <div className="space-y-2 pt-2">
          {/* Gmail */}
          <button
            onClick={handleGmailClick}
            disabled={gmail.status === "loading" || gmail.syncing}
            className="w-full flex items-center gap-3 rounded-xl border bg-card p-3 hover:bg-muted transition-colors disabled:opacity-50"
          >
            <div className="rounded-lg bg-muted p-2 shrink-0">
              <img src="/logos/gmail.svg" alt="Gmail" className="h-5 w-5 object-contain" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Gmail</p>
              <p className="text-xs text-muted-foreground">
                {gmail.status === "loading" && "Checking…"}
                {gmail.status === "disconnected" && "Scan booking confirmation emails"}
                {gmail.status === "connected" && (gmail.lastSyncAt
                  ? `Last synced ${new Date(gmail.lastSyncAt).toLocaleDateString()}`
                  : "Ready to sync")}
              </p>
            </div>
            <div className="shrink-0">
              {gmail.status === "loading" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {gmail.status === "disconnected" && <span className="text-xs font-medium text-primary">Connect</span>}
              {gmail.status === "connected" && !gmail.syncing && (
                <span className="flex items-center gap-1 text-xs font-medium text-primary">
                  <RefreshCw className="h-3.5 w-3.5" /> Sync
                </span>
              )}
              {gmail.syncing && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>
          </button>

          {/* Strava */}
          <button
            onClick={() => toast.info("Strava integration coming soon!")}
            className="w-full flex items-center gap-3 rounded-xl border bg-card p-3 hover:bg-muted transition-colors opacity-60"
          >
            <div className="rounded-lg bg-muted p-2 shrink-0">
              <img src="/logos/strava.svg" alt="Strava" className="h-5 w-5 object-contain" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Strava</p>
              <p className="text-xs text-muted-foreground">Import runs & rides</p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">Soon</span>
          </button>

          {/* Oura */}
          <button
            onClick={() => toast.info("Oura integration coming soon!")}
            className="w-full flex items-center gap-3 rounded-xl border bg-card p-3 hover:bg-muted transition-colors opacity-60"
          >
            <div className="rounded-lg bg-muted p-2 shrink-0">
              <img src="/logos/oura.png" alt="Oura" className="h-5 w-5 object-contain" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Oura</p>
              <p className="text-xs text-muted-foreground">Sync ring activity</p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">Soon</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SyncWorkoutsDialog;
