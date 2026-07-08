import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { OG_IMAGE_ALT, OG_IMAGE_SIZE } from '@/lib/metadata';

export const alt = OG_IMAGE_ALT;
export const size = OG_IMAGE_SIZE;
export const contentType = 'image/png';

const BG = '#080a07';
const BG_DEEP = '#040503';
const SURFACE = '#0f130c';
const SURFACE2 = '#161b11';
const BORDER = '#212818';
const BORDER_BRIGHT = '#343d27';
const TEXT = '#f1f5ea';
const DIM = '#c6cdb9';
const MUTED = '#828b74';
const LIME = '#c7f23c';
const DANGER = '#f4543b';
const DANGER_SOFT = 'rgba(244, 84, 59, 0.16)';
const ON_DANGER = '#190503';

const PW = 1072;
const PH = 312;
const NOTCH = 20;
const PAD = 58;

const SHIELD_PATH =
    'M5580 10471 l0 -1230 618 -4 617 -3 110 -21 110 -21 62 -16 63 -17 87 -30 88 -31 136 -69 137 -68 83 -57 84 -57 70 -57 70 -58 110 -113 111 -114 45 -60 46 -60 53 -80 52 -80 74 -150 73 -150 41 -123 40 -123 25 -135 25 -136 11 -122 11 -121 -6 -110 -7 -110 -15 -100 -16 -100 -25 -100 -25 -100 -35 -95 -36 -95 -62 -125 -63 -125 -62 -95 -62 -95 -76 -95 -75 -95 -221 -221 -221 -220 -145 -120 -145 -120 -85 -66 -85 -65 -45 -23 -45 -23 -65 0 -65 0 -41 21 -41 21 -184 137 -184 136 -230 176 -230 176 -195 152 -195 153 -32 26 -33 26 0 -349 0 -349 188 -149 187 -150 180 -135 180 -135 135 -96 135 -95 213 -142 213 -142 37 22 37 23 120 80 120 80 155 110 155 110 170 137 170 136 140 125 140 125 104 108 103 109 87 104 86 103 84 117 83 117 71 120 71 120 47 105 47 105 42 120 41 120 24 95 24 96 16 100 16 99 6 206 6 206 -12 129 -12 129 -15 85 -14 85 -40 147 -40 148 -46 117 -45 118 -59 120 -59 120 -89 135 -88 135 -84 105 -84 105 -105 105 -106 105 -110 88 -110 88 -110 74 -110 73 -109 60 -108 61 -124 51 -124 51 -92 30 -93 30 -100 25 -100 24 -100 15 -100 16 -245 8 -245 8 -40 20 -40 21 -16 18 -17 19 -18 35 -19 35 0 485 0 485 22 40 21 40 24 21 23 22 35 18 35 19 1150 3 1150 3 110 -11 110 -11 125 -25 125 -25 90 -31 90 -30 113 -53 112 -54 63 -37 62 -38 90 -66 90 -67 69 -64 70 -64 74 -85 74 -85 68 -102 68 -102 65 -133 65 -133 36 -107 35 -107 20 -98 20 -98 13 -90 13 -90 0 -1330 0 -1330 -13 -100 -13 -100 -20 -120 -20 -119 -39 -151 -39 -150 -40 -111 -40 -112 -41 -98 -42 -99 -90 -177 -91 -177 -86 -136 -86 -135 -78 -105 -79 -106 -80 -97 -80 -97 -129 -142 -129 -143 -168 -155 -168 -155 -140 -116 -139 -116 -150 -113 -150 -113 -170 -115 -170 -115 -145 -89 -145 -90 -175 -100 -175 -100 -144 -79 -145 -78 -76 0 -76 0 -115 61 -114 61 -170 97 -170 98 -100 60 -100 60 -163 105 -162 104 -173 122 -172 121 -135 105 -135 105 -140 119 -140 120 -191 191 -190 190 -98 115 -98 115 -83 110 -83 110 -69 105 -70 105 -60 105 -61 105 -65 131 -66 131 -46 108 -46 109 -38 110 -38 111 -31 110 -31 110 -20 95 -21 95 -22 125 -23 125 -5 2499 -5 2498 -82 -85 -82 -85 -60 -81 -59 -81 -50 -82 -50 -83 -37 -80 -36 -80 -39 -115 -38 -115 -21 -101 -21 -101 -10 -144 -11 -144 3 -1815 4 -1815 17 -115 17 -115 21 -110 20 -110 25 -100 25 -100 40 -133 41 -134 38 -101 38 -102 50 -115 49 -115 48 -95 48 -95 60 -105 60 -104 70 -111 71 -110 82 -115 81 -115 93 -115 93 -115 98 -112 98 -111 128 -129 128 -128 130 -114 130 -114 165 -132 165 -131 135 -99 135 -99 225 -151 225 -151 206 -126 206 -126 209 -119 209 -119 155 -84 155 -83 59 -33 59 -32 136 71 136 70 210 115 210 114 194 116 195 115 165 104 166 105 160 111 160 111 135 100 135 99 115 92 116 92 154 133 155 134 155 156 155 155 129 150 129 150 102 136 103 137 85 128 85 129 57 100 58 100 68 135 67 135 50 120 50 120 42 120 41 120 39 142 39 143 25 122 25 123 18 130 18 130 0 1925 0 1925 -18 89 -18 89 -39 117 -38 117 -41 83 -41 82 -51 77 -52 76 -68 80 -68 81 -59 51 -59 52 -78 56 -78 56 -61 34 -61 34 -88 35 -88 35 -122 30 -122 31 -120 10 -120 10 -2012 0 -2013 0 0 -1229z';

export default async function Image() {
    const [chakraPetch, electrolize, jbMono] = await Promise.all([
        readFile(new URL('./ChakraPetch-Bold.ttf', import.meta.url)),
        readFile(new URL('./Electrolize-Regular.ttf', import.meta.url)),
        readFile(new URL('./JetBrainsMono-Regular.ttf', import.meta.url))
    ]);

    return new ImageResponse(
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                padding: `${PAD}px 64px`,
                background: BG,
                color: TEXT,
                fontFamily: 'Electrolize'
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <svg
                        width={31}
                        height={37}
                        viewBox='0 0 819.623002 973.806494'
                        style={{ display: 'flex' }}
                    >
                        <path
                            transform='translate(-289.876998,1170) scale(0.1,-0.1)'
                            fill={LIME}
                            d={SHIELD_PATH}
                        />
                    </svg>
                    <div
                        style={{
                            display: 'flex',
                            fontFamily: 'Chakra Petch',
                            fontWeight: 700,
                            fontSize: 28,
                            letterSpacing: '0.16em'
                        }}
                    >
                        <span style={{ color: TEXT }}>DOPPEL</span>
                        <span style={{ color: MUTED }}>SHIELD</span>
                    </div>
                </div>
                <span
                    style={{
                        display: 'flex',
                        fontSize: 20,
                        color: MUTED,
                        letterSpacing: '0.34em'
                    }}
                >
                    URL FORENSICS
                </span>
            </div>

            <div
                style={{
                    display: 'flex',
                    flexGrow: 1,
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}
            >
                <div
                    style={{
                        position: 'relative',
                        width: PW,
                        height: PH,
                        display: 'flex'
                    }}
                >
                    <svg
                        width={PW}
                        height={PH}
                        viewBox={`0 0 ${PW} ${PH}`}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            display: 'flex'
                        }}
                    >
                        <polygon
                            points={`${NOTCH},0 ${PW},0 ${PW},${PH - NOTCH} ${PW - NOTCH},${PH} 0,${PH} 0,${NOTCH}`}
                            fill={SURFACE}
                            stroke={BORDER_BRIGHT}
                            strokeWidth={1.5}
                        />
                    </svg>
                    <div
                        style={{
                            position: 'relative',
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            padding: '0 48px'
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <span
                                style={{
                                    display: 'flex',
                                    fontSize: 18,
                                    color: MUTED,
                                    letterSpacing: '0.24em'
                                }}
                            >
                                VERDICT
                            </span>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: DANGER,
                                    color: ON_DANGER,
                                    fontFamily: 'Chakra Petch',
                                    fontWeight: 700,
                                    fontSize: 22,
                                    letterSpacing: '0.12em',
                                    padding: '9px 18px',
                                    boxShadow:
                                        '0 0 26px rgba(244, 84, 59, 0.38)'
                                }}
                            >
                                FLAGGED
                            </div>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                marginTop: 32,
                                fontFamily: 'JetBrains Mono',
                                fontSize: 58
                            }}
                        >
                            <span style={{ display: 'flex', color: MUTED }}>
                                https://
                            </span>
                            <span style={{ display: 'flex', color: TEXT }}>
                                p
                            </span>
                            <span
                                style={{
                                    display: 'flex',
                                    color: DANGER,
                                    background: DANGER_SOFT,
                                    borderBottom: `2px solid ${DANGER}`,
                                    textShadow:
                                        '0 0 15px rgba(244, 84, 59, 0.75)'
                                }}
                            >
                                a
                            </span>
                            <span style={{ display: 'flex', color: TEXT }}>
                                ypal.com
                            </span>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 18,
                                marginTop: 32,
                                background: BG_DEEP,
                                border: `1px solid ${BORDER}`,
                                borderLeft: `3px solid ${DANGER}`,
                                padding: '15px 20px'
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    fontFamily: 'JetBrains Mono',
                                    fontSize: 20,
                                    color: DIM,
                                    background: SURFACE2,
                                    border: `1px solid ${BORDER_BRIGHT}`,
                                    padding: '6px 13px'
                                }}
                            >
                                U+0430
                            </div>
                            <span
                                style={{
                                    display: 'flex',
                                    fontFamily: 'JetBrains Mono',
                                    fontSize: 20,
                                    color: MUTED
                                }}
                            >
                                {
                                    "CYRILLIC SMALL LETTER A  \u00b7  impersonates Latin 'a'"
                                }
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                <span
                    style={{
                        display: 'flex',
                        fontSize: 24,
                        color: '#b9c1ab',
                        letterSpacing: '0.02em'
                    }}
                >
                    Unmask deceptive domains.
                </span>
                <span
                    style={{
                        display: 'flex',
                        fontFamily: 'Chakra Petch',
                        fontWeight: 700,
                        fontSize: 26,
                        color: LIME,
                        letterSpacing: '0.05em'
                    }}
                >
                    doppelshield.com
                </span>
            </div>
        </div>,
        {
            ...size,
            fonts: [
                {
                    name: 'Chakra Petch',
                    data: chakraPetch,
                    weight: 700,
                    style: 'normal'
                },
                {
                    name: 'Electrolize',
                    data: electrolize,
                    weight: 400,
                    style: 'normal'
                },
                {
                    name: 'JetBrains Mono',
                    data: jbMono,
                    weight: 400,
                    style: 'normal'
                }
            ]
        }
    );
}
