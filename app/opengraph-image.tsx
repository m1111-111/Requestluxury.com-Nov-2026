import { ImageResponse } from 'next/og';

export const alt = 'RequestLuxury: Global Luxury Marketplace & Private Auctions';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Default social sharing image, drawn in the brand palette. Listing and category pages supply their own photograph. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: 'linear-gradient(150deg, #17171A 0%, #0B0B0C 60%, #050506 100%)',
          color: '#FFFFFF',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div
            style={{
              width: 84,
              height: 84,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #C5A467',
              color: '#C5A467',
              fontSize: 56,
            }}
          >
            R
          </div>
          <div style={{ display: 'flex', fontSize: 40, letterSpacing: 12 }}>
            REQUEST<span style={{ color: '#C5A467' }}>LUXURY</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 84, lineHeight: 1.05, letterSpacing: -1 }}>A world beyond the listing</div>
          <div style={{ display: 'flex', marginTop: 28, width: 120, height: 2, background: '#C5A467' }} />
          <div style={{ display: 'flex', marginTop: 28, fontSize: 28, color: '#D8D4CA', fontFamily: 'Helvetica, Arial, sans-serif' }}>
            Residences · Supercars · Yachts · Aviation · Horology · Jewelry
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 22, letterSpacing: 8, color: '#C5A467', fontFamily: 'Helvetica, Arial, sans-serif' }}>
          GLOBAL LUXURY MARKETPLACE & PRIVATE AUCTIONS
        </div>
      </div>
    ),
    size,
  );
}
