'use client'

// Replaces the ROOT layout, so it renders its own html and body and cannot use
// anything from app/layout.tsx: no Manrope, no globals.css, no shared chrome.
// Styles are inline for that reason. This fires only when the root layout
// itself fails, which is also when a missing font or stylesheet is most likely,
// so it must not depend on either.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F5F5F7',
          color: '#111827',
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: '28rem', width: '100%', textAlign: 'center' }}>
          <p style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px', margin: '0 0 24px' }}>
            LABLLD
          </p>
          <h1 style={{ fontSize: '28px', lineHeight: 1.2, margin: '0 0 8px', fontWeight: 600 }}>
            Algo salió mal.
          </h1>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 24px', lineHeight: 1.6 }}>
            La aplicación no pudo cargarse. Intenta de nuevo. Si vuelve a pasar, comparte el
            código de abajo con el equipo de LABLLD.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              height: '48px',
              padding: '0 24px',
              background: '#111827',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              border: 0,
              borderRadius: '9999px',
              cursor: 'pointer',
            }}
          >
            Intentar de nuevo
          </button>
          {error.digest && (
            <p style={{ marginTop: '32px', fontSize: '12px', color: '#9CA3AF' }}>
              Código del error:{' '}
              <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: '#6B7280' }}>
                {error.digest}
              </span>
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
