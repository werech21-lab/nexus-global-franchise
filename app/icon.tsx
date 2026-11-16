import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#081325',
          color: '#d4ac65',
          fontSize: 20,
          fontWeight: 800,
        }}
      >
        N
      </div>
    ),
    size
  )
}
