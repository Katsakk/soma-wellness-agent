import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, RefreshCw } from "lucide-react";
import { useGmailIntegration } from "@/hooks/useGmailIntegration";
import { useStravaIntegration } from "@/hooks/useStravaIntegration";

interface SyncWorkoutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSynced?: () => void;
}

const SyncWorkoutsDialog = ({ open, onOpenChange, onSynced }: SyncWorkoutsDialogProps) => {
  const gmail  = useGmailIntegration();
  const strava = useStravaIntegration();

  const handleGmailClick = () => {
    if (gmail.status === "disconnected") {
      gmail.connect("/activity");
    } else if (gmail.status === "connected") {
      gmail.sync(() => { onSynced?.(); onOpenChange(false); });
    }
  };

  const handleStravaClick = () => {
    if (strava.status === "disconnected") {
      strava.connect("/activity");
    } else if (strava.status === "connected") {
      strava.sync(() => { onSynced?.(); onOpenChange(false); });
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

          {/* Strava */}
          <IntegrationRow
            logo="/logos/strava.svg"
            name="Strava"
            status={strava.status}
            syncing={strava.syncing}
            lastSyncAt={strava.lastSyncAt}
            subtitle="Import runs, rides & all activities"
            onClick={handleStravaClick}
          />

          {/* Gmail */}
          <IntegrationRow
            logo="/logos/gmail.svg"
            name="Gmail"
            status={gmail.status}
            syncing={gmail.syncing}
            lastSyncAt={gmail.lastSyncAt}
            subtitle="Scan booking confirmation emails"
            onClick={handleGmailClick}
          />

          {/* Oura */}
          <IntegrationRow
            logo="/logos/oura.png"
            name="Oura"
            status="soon"
            subtitle="Sync ring activity data"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

type IntegrationStatus = "loading" | "connected" | "disconnected" | "soon";

function IntegrationRow({
  logo, name, status, syncing, lastSyncAt, subtitle, onClick,
}: {
  logo: string; name: string; status: IntegrationStatus;
  syncing?: boolean; lastSyncAt?: string | null;
  subtitle: string; onClick?: () => void;
}) {
  const isSoon = status === "soon";
  const isLoading = status === "loading";
  const isConnected = status === "connected";

  const subtext = isLoading ? "Checking\u2026"
    : isSoon ? subtitle
    : !isConnected ? subtitle
    : lastSyncAt
      ? `Last synced ${new Date(lastSyncAt).toLocaleDateString()}`
      : "Ready to sync";

  return (
    <button
      onClick={onClick}
      disabled={isSoon || isLoading || syncing}
      className={`w-full flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors disabled:cursor-default ${
        isSoon ? "opacity-50" : "hover:bg-secondary"
      }`}
    >
      <div className="rounded-lg bg-secondary p-2 shrink-0">
        <img src={logo} alt={name} className="h-5 w-5 object-contain" />
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground truncate">{subtext}</p>
      </div>
      <div className="shrink-0">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {syncing  && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        {isSoon   && <span className="text-xs text-muted-foreground">Soon</span>}
        {!isSoon && !isLoading && !syncing && !isConnected && (
          <span className="text-xs font-medium text-primary">Connect</span>
        )}
        {!isSoon && !isLoading && !syncing && isConnected && (
          <span className="flex items-center gap-1 text-xs font-medium text-primary">
            <RefreshCw className="h-3.5 w-3.5" /> Sync
          </span>
        )}
      </div>
    </button>
  );
}

export default SyncWorkoutsDialog;
