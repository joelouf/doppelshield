import { ImageResponse } from 'next/og';

export const alt = 'DoppelShield / URL Forensics & Homograph Scanner';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
    return new ImageResponse(
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '96px',
                background: '#080a07',
                color: '#f1f5ea',
                fontFamily: 'sans-serif'
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    fontSize: 32,
                    letterSpacing: '0.2em',
                    color: '#c7f23c'
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        width: 28,
                        height: 28,
                        borderLeft: '4px solid #c7f23c',
                        borderTop: '4px solid #c7f23c'
                    }}
                />
                DOPPELSHIELD
            </div>
            <div
                style={{
                    display: 'flex',
                    fontSize: 88,
                    fontWeight: 700,
                    marginTop: 44
                }}
            >
                <span>Unmask&nbsp;</span>
                <span style={{ color: '#c7f23c' }}>deceptive domains.</span>
            </div>
            <div
                style={{
                    display: 'flex',
                    fontSize: 30,
                    lineHeight: 1.4,
                    color: '#828b74',
                    marginTop: 32,
                    maxWidth: 880
                }}
            >
                URL forensics tool that decodes the host, flags look-alike
                characters, and traces the redirect chain to surface homograph
                attacks.
            </div>
        </div>,
        { ...size }
    );
}
