import { AssetEvent } from '@/types/industrial';
import { cn } from '@/lib/utils';
import { MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AssetJourneyTimelineProps {
  events: AssetEvent[];
  currentLocation: string | null;
}

interface Step {
  location: string;
  arrivedAt: Date;
  leftAt: Date | null;
  hasViolation: boolean;
  isCurrent: boolean;
}

export const AssetJourneyTimeline = ({ events, currentLocation }: AssetJourneyTimelineProps) => {
  // Build ordered steps from locationChanged events
  const locationEvents = events
    .filter(e => e.eventType === 'locationChanged')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const violationLocations = new Set(
    events
      .filter(e => e.eventType === 'qualityViolation')
      .map(e => e.payload?.location as string)
      .filter(Boolean)
  );

  if (locationEvents.length === 0 && !currentLocation) {
    return <p className="text-sm text-muted-foreground text-center py-4">No journey data available.</p>;
  }

  const steps: Step[] = [];

  // First step: origin of first move
  if (locationEvents.length > 0 && locationEvents[0].fromLocation) {
    steps.push({
      location: locationEvents[0].fromLocation,
      arrivedAt: new Date(locationEvents[0].createdAt.getTime() - 1000),
      leftAt: locationEvents[0].createdAt,
      hasViolation: violationLocations.has(locationEvents[0].fromLocation),
      isCurrent: false,
    });
  }

  locationEvents.forEach((ev, i) => {
    if (ev.toLocation) {
      const nextEv = locationEvents[i + 1];
      steps.push({
        location: ev.toLocation,
        arrivedAt: ev.createdAt,
        leftAt: nextEv?.createdAt ?? null,
        hasViolation: violationLocations.has(ev.toLocation),
        isCurrent: ev.toLocation === currentLocation && !nextEv,
      });
    }
  });

  // If no events but we have a current location
  if (steps.length === 0 && currentLocation) {
    steps.push({
      location: currentLocation,
      arrivedAt: new Date(),
      leftAt: null,
      hasViolation: false,
      isCurrent: true,
    });
  }

  const formatDuration = (from: Date, to: Date) => {
    const mins = Math.round((to.getTime() - from.getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.round(hrs / 24)}d`;
  };

  return (
    <div className="flex items-start gap-0 overflow-x-auto pb-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start shrink-0">
          {/* Step node */}
          <div className="flex flex-col items-center min-w-[120px]">
            <div
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full border-2',
                step.isCurrent
                  ? 'border-primary bg-primary/10 text-primary'
                  : step.hasViolation
                  ? 'border-destructive bg-destructive/10 text-destructive'
                  : 'border-muted-foreground/30 bg-muted text-muted-foreground'
              )}
            >
              {step.hasViolation ? (
                <AlertTriangle className="h-5 w-5" />
              ) : step.isCurrent ? (
                <MapPin className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </div>
            <span className="text-xs font-mono mt-2 text-center leading-tight max-w-[110px]">
              {step.location.split('/').pop()}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">
              {step.arrivedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
            {step.leftAt && (
              <span className="text-[10px] text-muted-foreground">
                ({formatDuration(step.arrivedAt, step.leftAt)})
              </span>
            )}
            {step.isCurrent && (
              <span className="text-[10px] font-semibold text-primary mt-0.5">Current</span>
            )}
          </div>
          {/* Connector line */}
          {i < steps.length - 1 && (
            <div className="flex items-center pt-5">
              <div className="w-8 h-0.5 bg-border" />
              <div className="w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-border" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
