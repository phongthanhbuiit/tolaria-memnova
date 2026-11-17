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
      className="fixed inset-0 z-50"
      contentClassName="w-full rounded-lg border border-border bg-background shadow-[0_18px_55px_var(--shadow-dialog)]"
      style={{ background: 'var(--shadow-overlay)' }}
      contentStyle={{
        width: 'min(440px, 100%)',
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        alignItems: 'center',
      }}
      testId="telemetry-consent-shell"
    >
      <>
        <ShieldCheck size={40} weight="duotone" style={{ color: 'var(--primary)' }} />

        <div style={{ textAlign: 'center' }}>
          <h2 className="text-(length:--text-title) leading-(--text-title--line-height)" style={{ fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>
            Help improve Tolaria
          </h2>
          <p className="text-(length:--text-body) leading-(--text-body--line-height)" style={{ color: 'var(--muted-foreground)',  marginTop: 8 }}>
            Send anonymous crash reports to help us fix bugs faster.
            No vault content, no personal data, no tracking.
          </p>
        </div>

        <div className="text-(length:--text-small) leading-(--text-small--line-height)" style={{ color: 'var(--muted-foreground)',  width: '100%' }}>
          <p style={{ margin: '0 0 6px', fontWeight: 500, color: 'var(--foreground)' }}>What we collect:</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Stack traces from errors (JS &amp; Rust)</li>
            <li>App version, OS, and architecture</li>
          </ul>
          <p style={{ margin: '10px 0 6px', fontWeight: 500, color: 'var(--foreground)' }}>What we never collect:</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>No vault content, note titles, or file paths</li>
            <li>No personal data or IP addresses</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 4 }}>
          <Button className="text-(length:--text-body) leading-(--text-body--line-height)"
            type="button"
            variant="outline"
            style={{ flex: 1,  padding: '10px 16px' }}
            onClick={onDecline}
            data-testid="telemetry-decline"
            autoFocus
          >
            No thanks
          </Button>
          <Button className="text-(length:--text-body) leading-(--text-body--line-height)"
            type="button"
            style={{ flex: 1,  padding: '10px 16px', fontWeight: 500 }}
            onClick={onAccept}
            data-testid="telemetry-accept"
          >
            Allow anonymous reporting
          </Button>
        </div>

        <p className="text-(length:--text-caption) leading-(--text-caption--line-height)" style={{ color: 'var(--muted-foreground)', margin: 0, textAlign: 'center' }}>
          You can change this anytime in Settings.
        </p>
      </>
    </OnboardingShell>
  )
}
