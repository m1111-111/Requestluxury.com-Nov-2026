'use client';

/** Last-resort error screen, shown when the root layout itself fails. Uses inline styles because no stylesheet is guaranteed. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0B0B0C', color: '#fff', fontFamily: 'Georgia, serif' }}>
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
          <p style={{ color: '#C5A467', letterSpacing: 6, fontSize: 14 }}>REQUESTLUXURY</p>
          <h1 style={{ fontWeight: 400, fontSize: 40, margin: '24px 0 12px' }}>We will be back in a moment</h1>
          <p style={{ color: '#bbb', fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 16, maxWidth: 460, lineHeight: 1.6 }}>
            Something went wrong while loading the site. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 28, padding: '14px 28px', background: '#C5A467', color: '#0B0B0C', border: 0, letterSpacing: 2, fontSize: 13, cursor: 'pointer' }}
          >
            TRY AGAIN
          </button>
        </main>
      </body>
    </html>
  );
}
