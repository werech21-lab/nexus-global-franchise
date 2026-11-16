import { ImageResponse } from 'next/og'
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          background: '#081325',
          color: '#f5f7fc',
        }}
      >
        <div style={{ color: '#d4ac65', fontSize: 28, marginBottom: 24 }}>
          Nexus
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.15 }}>
          {SITE_NAME}
        </div>
        <div style={{ marginTop: 28, fontSize: 28, color: '#cbd5e1', maxWidth: 900 }}>
          {SITE_DESCRIPTION}
        </div>
      </div>
    ),
    size
  )
}
