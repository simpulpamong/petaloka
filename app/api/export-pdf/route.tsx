/**
 * API Route: POST /api/export-pdf  —  PETA VEKTOR MURNI (HD)
 *
 * Sisi client memproyeksikan GeoJSON menjadi path SVG "d" (mm → pt) lewat
 * lib/print/renderSheet.ts; route ini merangkai dokumen PDF via
 * @react-pdf/renderer: kop surat, judul, muka peta (Svg vektor), label
 * kecamatan, legenda, panah utara, batang skala, catatan,
 * dan blok tanda tangan. Teks & garis VERTOR — tetap tajam mulai A4, F4, A3,
 * A2, A0, sampai kertas kustom banner dalam ukuran apa pun.
 *
 * Kenapa bukan Puppeteer? Puppeteer butuh binary Chrome (~300 MB) yang tidak
 * serverless-friendly. @react-pdf/renderer murni JS, berjalan di Node runtime
 * Vercel, dan menghasilkan PDF vektor sungguhan (bukan screenshot).
 */

import { NextResponse, type NextRequest } from 'next/server';
import type { ReactNode } from 'react';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/* -------------------------------------------------------------------------- */
/* Tipe payload (sinkron dengan VectorPayload di lib/print/renderSheet.ts)      */
/* -------------------------------------------------------------------------- */

interface VectorPayload {
  paper: { widthMm: number; heightMm: number };
  header: {
    show: boolean;
    agencyLine1: string;
    agencyLine2: string;
    yearLabel: string;
    title: string;
    subtitle: string;
    logo: string | null;
  };
  map: {
    x: number;
    y: number;
    width: number;
    height: number;
    paths: {
      d: string;
      fill: string | null;
      fillOpacity: number;
      stroke: string | null;
      strokeWidth: number;
      dash?: string;
    }[];
    labels: { x: number; y: number; text: string; fontSize?: number }[];
    north: { x: number; y: number; size: number } | null;
    scaleBar:
      | { x: number; y: number; segWidth: number; segments: number; label: string; denominator: string }
      | null;
  };
  legend: {
    show: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    title: string;
    rows: { color: string; label: string; kind: 'band' | 'noData' }[];
    footerLines: string[];
  };
  footer: {
    showTimestamp: boolean;
    printedAt: string;
    basedNote: string[];
    signature: { show: boolean; dateText: string; jabatan: string; nama: string; nip: string };
  };
}

const MM = 72 / 25.4; // mm → pt

/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
  let payload: VectorPayload;
  try {
    payload = (await request.json()) as VectorPayload;
  } catch {
    return NextResponse.json({ error: 'Payload JSON tidak valid.' }, { status: 400 });
  }

  if (!payload?.paper?.widthMm || !payload?.paper?.heightMm) {
    return NextResponse.json({ error: 'Ukuran kertas wajib diisi.' }, { status: 400 });
  }

  const widthPt = Math.min(6 * 1440, payload.paper.widthMm * MM);
  const heightPt = Math.min(6 * 1440, payload.paper.heightMm * MM);
  const pagePad = 10 * MM;

  try {
    const { Document, Page, Text, View, Svg, Path, Image, Rect, renderToBuffer } = await import(
      '@react-pdf/renderer'
    );

    /* ------------------------------ legenda ------------------------------- */
    const legendChildren: ReactNode[] = [];
    if (payload.legend.show) {
      legendChildren.push(
        <Text
          key="lg-title"
          style={{
            position: 'absolute',
            left: pagePad,
            top: 10 * MM,
            fontFamily: 'Helvetica-Bold',
            fontSize: 8.4,
            color: '#0f172a',
          }}
        >
          {payload.legend.title}
        </Text>,
      );
      const rows = payload.legend.rows.slice(0, 24);
      rows.forEach((row, i) => {
        legendChildren.push(
          <View
            key={`lg-row-${i}`}
            style={{
              position: 'absolute',
              left: pagePad,
              top: (20 + i * 4.6) * MM,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Rect width={7.4} height={7.4} fill={row.color} stroke="#94a3b8" strokeWidth={0.3} />
            <Text
              style={{
                marginLeft: 5,
                fontFamily: 'Helvetica',
                fontSize: 7.2,
                color: '#334155',
              }}
            >
              {row.label}
            </Text>
          </View>,
        );
      });

      let fy = (22 + rows.length * 4.6) * MM;
      payload.legend.footerLines.slice(0, 4).forEach((line, i) => {
        legendChildren.push(
          <Text
            key={`lg-foot-${i}`}
            style={{
              position: 'absolute',
              left: pagePad,
              top: fy + i * 9,
              width: Math.max(60, payload.legend.width - pagePad * 2),
              fontFamily: 'Helvetica',
              fontSize: 6.2,
              color: '#64748b',
            }}
          >
            {line}
          </Text>,
        );
      });
    }

    /* ------------------------------ batang skala --------------------------- */
    const bar = payload.map.scaleBar;
    const barChildren: ReactNode[] = [];
    if (bar) {
      for (let i = 0; i < bar.segments; i++) {
        barChildren.push(
          <Rect
            key={`bar-${i}`}
            x={bar.x + i * bar.segWidth}
            y={bar.y}
            width={bar.segWidth}
            height={4.2}
            fill={i % 2 === 0 ? '#0f172a' : '#ffffff'}
            stroke="#0f172a"
            strokeWidth={0.6}
          />,
        );
      }
      barChildren.push(
        <Text
          key="bar-label"
          x={bar.x}
          y={bar.y - 4}
          style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, fill: '#0f172a' } as never}
        >
          {bar.label}
        </Text>,
        <Text
          key="bar-denom"
          x={bar.x + bar.segments * bar.segWidth + 6}
          y={bar.y + 3}
          style={{ fontFamily: 'Helvetica', fontSize: 5.8, fill: '#64748b' } as never}
        >
          {bar.denominator}
        </Text>,
      );
    }

    /* ------------------------------ muka peta ------------------------------ */
    const svgMap = (
      <Svg
        style={{
          position: 'absolute',
          left: payload.map.x,
          top: payload.map.y,
          width: payload.map.width,
          height: payload.map.height,
          border: '1px solid #94a3b8',
        }}
        viewBox={`0 0 ${payload.map.width} ${payload.map.height}`}
      >
        <Rect
          x={0}
          y={0}
          width={payload.map.width}
          height={payload.map.height}
          fill="#eef2f6"
          stroke="#94a3b8"
          strokeWidth={0.8}
        />
        {payload.map.paths.map((p, i) => (
          <Path
            key={`mp-${i}`}
            d={p.d}
            fill={p.fill ?? 'none'}
            fillOpacity={p.fillOpacity}
            stroke={p.stroke ?? 'none'}
            strokeWidth={p.strokeWidth}
            {...(p.dash ? { strokeDasharray: p.dash, strokeLinejoin: 'round' } : { strokeLinejoin: 'round' })}
          />
        ))}
        {payload.map.labels.map((lb, i) => (
          <Text
            key={`mp-lab-${i}`}
            x={lb.x}
            y={lb.y}
            style={{
              fontFamily: 'Helvetica-Bold',
              fontSize: lb.fontSize ?? 6.8,
              fill: '#0f172a',
              stroke: '#ffffff',
              strokeWidth: Math.min(1.6, lb.fontSize ? lb.fontSize * 0.22 : 1.6),
              textAnchor: 'middle',
            } as never}
          >
            {lb.text}
          </Text>
        ))}
        {payload.map.north
          ? [
              <Path
                key="north"
                d={`M ${payload.map.north.x} ${payload.map.north.y - payload.map.north.size} ` +
                  `L ${payload.map.north.x + payload.map.north.size * 0.55} ${payload.map.north.y + payload.map.north.size * 0.55} ` +
                  `L ${payload.map.north.x} ${payload.map.north.y + payload.map.north.size * 0.25} ` +
                  `L ${payload.map.north.x - payload.map.north.size * 0.55} ${payload.map.north.y + payload.map.north.size * 0.55} Z`}
                fill="#0f172a"
                stroke="#ffffff"
                strokeWidth={0.8}
              />,
              <Text
                key="north-u"
                x={payload.map.north.x}
                y={payload.map.north.y - payload.map.north.size - 4}
                style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, fill: '#0f172a', textAnchor: 'middle' } as never}
              >
                U
              </Text>,
            ]
          : null}
        {barChildren}
      </Svg>
    );

    /* ------------------------------ dokumen -------------------------------- */
    const doc = (
      <Document
        title={payload.header.title || 'Peta Kerawanan Wilayah'}
        author="PetaLoka"
        creator="PetaLoka — Next.js + @react-pdf/renderer"
        keywords="peta kerawanan, geojson, hd, vektor, percetakan"
      >
        <Page size={[widthPt, heightPt]} style={{ backgroundColor: '#ffffff' }}>
          {/* KOP */}
          {payload.header.show
            ? [
                payload.header.logo ? (
                  <Image
                    key="kop-logo"
                    style={{
                      position: 'absolute',
                      left: pagePad,
                      top: 3 * MM,
                      width: 20 * MM,
                      height: 20 * MM,
                      objectFit: 'contain',
                    }}
                    src={payload.header.logo}
                  />
                ) : null,
                <Text
                  key="kop-l1"
                  style={{
                    position: 'absolute',
                    left: payload.header.logo ? 32 * MM : pagePad,
                      top: 4.5 * MM,
                    fontFamily: 'Times-Bold',
                    fontSize: 11,
                    color: '#0f172a',
                  }}
                >
                  {payload.header.agencyLine1.toUpperCase()}
                </Text>,
                payload.header.agencyLine2 ? (
                  <Text
                    key="kop-l2"
                    style={{
                      position: 'absolute',
                      left: payload.header.logo ? 32 * MM : pagePad,
                      top: 10.8 * MM,
                      fontFamily: 'Times-Roman',
                      fontSize: 9.5,
                      color: '#1e293b',
                    }}
                  >
                    {payload.header.agencyLine2.toUpperCase()}
                  </Text>
                ) : null,
                <View
                  key="kop-rule"
                  style={{
                    position: 'absolute',
                    left: pagePad,
                    right: pagePad,
                    top: 17.8 * MM,
                    height: 0,
                    borderBottomWidth: 0.5,
                    borderBottomColor: '#94a3b8',
                  }}
                />,
                payload.header.title ? (
                  <Text
                    key="kop-title"
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: 20.5 * MM,
                      textAlign: 'center',
                      fontFamily: 'Helvetica-Bold',
                      fontSize: 10.5,
                      color: '#0f172a',
                    }}
                  >
                    {payload.header.title}
                  </Text>
                ) : null,
                payload.header.subtitle ? (
                  <Text
                    key="kop-sub"
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: 25 * MM,
                      textAlign: 'center',
                      fontFamily: 'Helvetica',
                      fontSize: 7.8,
                      color: '#64748b',
                    }}
                  >
                    {payload.header.subtitle}
                  </Text>
                ) : null,
              ].filter(Boolean)
            : payload.header.title
              ? [
                  <Text
                    key="solo-title"
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: 12 * MM,
                      textAlign: 'center',
                      fontFamily: 'Helvetica-Bold',
                      fontSize: 11,
                      color: '#0f172a',
                    }}
                  >
                    {payload.header.title}
                  </Text>,
                ]
              : null}

          {svgMap}

          {/* LEGENDA */}
          {payload.legend.show ? (
            <View
              style={{
                position: 'absolute',
                left: payload.legend.x,
                top: payload.legend.y,
                width: payload.legend.width,
                height: payload.legend.height,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
              }}
            >
              {legendChildren}
            </View>
          ) : null}

          {/* CATATAN + METADATA CETAK */}
          {payload.footer.basedNote.slice(0, 5).map((line, i) => (
            <Text
              key={`fn-${i}`}
              style={{
                position: 'absolute',
                left: pagePad,
                top: heightPt - 9.4 * MM - (payload.footer.basedNote.length - i) * 9,
                width: widthPt - pagePad * 2 - 50 * MM,
                fontFamily: 'Helvetica',
                fontSize: 6.4,
                color: '#64748b',
              }}
            >
              {line}
            </Text>
          ))}

          {/* TANDA TANGAN */}
          {payload.footer.signature.show
            ? [
                <Text
                  key="sig-date"
                  style={{
                    position: 'absolute',
                    right: pagePad,
                    top: heightPt - 78,
                    fontFamily: 'Helvetica',
                    fontSize: 7.8,
                    color: '#0f172a',
                  }}
                >
                  {payload.footer.signature.dateText}
                </Text>,
                <Text
                  key="sig-jab"
                  style={{
                    position: 'absolute',
                    right: pagePad,
                    top: heightPt - 66,
                    fontFamily: 'Helvetica-Bold',
                    fontSize: 8.2,
                    color: '#0f172a',
                  }}
                >
                  {payload.footer.signature.jabatan.toUpperCase()}
                </Text>,
                <Text
                  key="sig-nama"
                  style={{
                    position: 'absolute',
                    right: pagePad,
                    top: heightPt - 36,
                    fontFamily: 'Helvetica-Bold',
                    fontSize: 8.8,
                    color: '#0f172a',
                  }}
                >
                  {payload.footer.signature.nama || '______________________'}
                </Text>,
                <Text
                  key="sig-nip"
                  style={{
                    position: 'absolute',
                    right: pagePad,
                    top: heightPt - 26,
                    fontFamily: 'Helvetica',
                    fontSize: 7.4,
                    color: '#334155',
                  }}
                >
                  {payload.footer.signature.nip
                    ? `NIP. ${payload.footer.signature.nip}`
                    : 'NIP. ______________________'}
                </Text>,
              ]
            : null}
        </Page>
      </Document>
    );

    const buffer = await renderToBuffer(doc);
    const fileName = `peta-vektor-${payload.paper.widthMm}x${payload.paper.heightMm}mm-${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[export-pdf] gagal:', err);
    return NextResponse.json(
      {
        error: 'Gagal merender PDF vektor.',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
