import { ShieldCheck } from '@phosphor-icons/react'
import { OnboardingShell } from './OnboardingShell'
import { Button } from './ui/button'

interface TelemetryConsentDialogProps {
  onAccept: () => void
  onDecline: () => void
}

export function TelemetryConsentDialog({ onAccept, onDecline }: TelemetryConsentDialogProps) {
  return (
    <OnboardingShell
      className="fixed inset-0 z-50 bg-(--shadow-overlay)"
      contentClassName="rounded-lg border border-border bg-background shadow-[0_18px_55px_var(--shadow-dialog)] w-[min(440px,_100%)] p-[32px] flex flex-col gap-[20px] items-center"
      testId="telemetry-consent-shell"
    >
      <>
        <ShieldCheck className="text-primary" size={40} weight="duotone" />

        <div className="text-center">
          <h2 className="text-(length:--text-title) leading-(--text-title--line-height) font-semibold text-foreground m-0">
            Help improve Tolaria
          </h2>
          <p className="text-(length:--text-body) leading-(--text-body--line-height) text-muted-foreground mt-[8px]">
            Send anonymous crash reports to help us fix bugs faster.
            No vault content, no personal data, no tracking.
          </p>
        </div>

        <div className="text-(length:--text-small) leading-(--text-small--line-height) text-muted-foreground w-full">
          <p className="m-[0_0_6px] font-medium text-foreground">What we collect:</p>
          <ul className="m-0 pl-[18px]">
            <li>Stack traces from errors (JS &amp; Rust)</li>
            <li>App version, OS, and architecture</li>
          </ul>
          <p className="m-[10px_0_6px] font-medium text-foreground">What we never collect:</p>
          <ul className="m-0 pl-[18px]">
            <li>No vault content, note titles, or file paths</li>
            <li>No personal data or IP addresses</li>
          </ul>
        </div>

        <div className="flex gap-[12px] w-full mt-[4px]">
          <Button className="text-(length:--text-body) leading-(--text-body--line-height) flex-1 p-[10px_16px]"
            type="button"
            variant="outline"
            onClick={onDecline}
            data-testid="telemetry-decline"
            autoFocus
          >
            No thanks
          </Button>
          <Button className="text-(length:--text-body) leading-(--text-body--line-height) flex-1 p-[10px_16px] font-medium"
            type="button"
            onClick={onAccept}
            data-testid="telemetry-accept"
          >
            Allow anonymous reporting
          </Button>
        </div>

        <p className="text-(length:--text-caption) leading-(--text-caption--line-height) text-muted-foreground m-0 text-center">
          You can change this anytime in Settings.
        </p>
      </>
    </OnboardingShell>
  )
}
