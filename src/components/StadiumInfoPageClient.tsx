'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import {
  getStadiumChipLabel,
  getStadiumDirectionsUrl,
  type StadiumDetail,
} from '@/lib/stadiumInfo';

type StadiumInfoPageClientProps = {
  stadiums: StadiumDetail[];
};

const pageBackground = '#F2F4F6';
const cardBackground = '#FFFFFF';
const mutedBackground = '#F2F4F6';
const vendorCardBackground = '#EEF3F8';
const titleColor = '#191F28';
const bodyColor = '#4E5968';
const subtleColor = '#8B95A1';
const selectedChipBackground = '#2F3438';
const shadowColor = 'rgba(15, 23, 42, 0.06)';

const rowLabelStyle: CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: bodyColor,
};

const rowValueStyle: CSSProperties = {
  fontSize: '14px',
  fontWeight: 800,
  color: titleColor,
  textAlign: 'right',
  whiteSpace: 'pre-line',
};

function lineClampOneStyle(): CSSProperties {
  return {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 1,
    WebkitBoxOrient: 'vertical',
  };
}

export default function StadiumInfoPageClient({ stadiums }: StadiumInfoPageClientProps) {
  const [selectedStadiumName, setSelectedStadiumName] = useState(stadiums[0]?.stadiumName ?? '');

  const selectedStadium =
    stadiums.find((stadium) => stadium.stadiumName === selectedStadiumName) ?? stadiums[0] ?? null;

  if (!selectedStadium) {
    return null;
  }

  const parkingTip = selectedStadium.parkingLots.find((lot) => lot.note.trim())?.note ?? '';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: pageBackground,
        paddingBottom: 'calc(96px + var(--safe-area-inset-bottom))',
      }}
    >
      <section
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: cardBackground,
          borderBottomLeftRadius: '24px',
          borderBottomRightRadius: '24px',
          boxShadow: `0 10px 30px ${shadowColor}`,
          paddingTop: 'calc(18px + var(--safe-area-inset-top))',
          paddingRight: '20px',
          paddingBottom: '24px',
          paddingLeft: '20px',
        }}
      >
        <div className="hide-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
          {stadiums.map((stadium) => {
            const selected = stadium.stadiumName === selectedStadium.stadiumName;

            return (
              <button
                key={stadium.stadiumName}
                onClick={() => setSelectedStadiumName(stadium.stadiumName)}
                style={{
                  flex: '0 0 auto',
                  borderRadius: '999px',
                  padding: '10px 14px',
                  background: selected ? selectedChipBackground : mutedBackground,
                  color: selected ? '#FFFFFF' : bodyColor,
                  fontSize: '13px',
                  fontWeight: selected ? 800 : 700,
                  boxShadow: selected ? '0 6px 18px rgba(47, 52, 56, 0.18)' : 'none',
                }}
              >
                {getStadiumChipLabel(stadium.stadiumName)}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: '18px' }}>
          <h1 style={{ fontSize: '26px', lineHeight: 1.2, color: titleColor, marginBottom: '10px' }}>
            {selectedStadium.stadiumName}
          </h1>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ minWidth: 0, color: bodyColor, fontSize: '14px', lineHeight: 1.5 }}>
              <span style={{ marginRight: '6px' }}>📍</span>
              {selectedStadium.address}
            </div>

            <a
              href={getStadiumDirectionsUrl(selectedStadium.address)}
              target="_blank"
              rel="noreferrer"
              style={{
                flex: '0 0 auto',
                color: titleColor,
                fontSize: '13px',
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}
            >
              길찾기 &gt;
            </a>
          </div>
        </div>
      </section>

      <main style={{ padding: '20px' }}>
        <section style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', lineHeight: 1.3, marginBottom: '12px', color: titleColor }}>
            🚗 주차 및 교통
          </h2>

          <div
            style={{
              background: cardBackground,
              borderRadius: '24px',
              padding: '24px',
              boxShadow: `0 8px 24px ${shadowColor}`,
            }}
          >
            {selectedStadium.parkingLots.map((parkingLot, index) => (
              <div
                key={parkingLot.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '92px minmax(0, 1fr)',
                  gap: '10px 12px',
                  paddingBottom: index === selectedStadium.parkingLots.length - 1 ? '0' : '16px',
                  marginBottom: index === selectedStadium.parkingLots.length - 1 ? '0' : '16px',
                  borderBottom: index === selectedStadium.parkingLots.length - 1 ? 'none' : '1px solid #F2F4F6',
                }}
              >
                <div style={rowLabelStyle}>주차 위치</div>
                <div style={rowValueStyle}>{parkingLot.parking_location}</div>
                <div style={rowLabelStyle}>주차 요금</div>
                <div style={rowValueStyle}>{parkingLot.fee_description}</div>
              </div>
            ))}

            {parkingTip ? (
              <div
                style={{
                  marginTop: '18px',
                  borderRadius: '18px',
                  background: mutedBackground,
                  padding: '16px 18px',
                  color: bodyColor,
                  fontSize: '13px',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-line',
                }}
              >
                <span style={{ fontWeight: 800, color: titleColor }}>💡 팁</span>
                <div style={{ marginTop: '6px' }}>{parkingTip}</div>
              </div>
            ) : null}
          </div>
        </section>

        <section style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', lineHeight: 1.3, marginBottom: '12px', color: titleColor }}>
            🍔 구장 맛도리
          </h2>

          <div
            style={{
              background: cardBackground,
              borderRadius: '24px',
              padding: '20px',
              boxShadow: `0 8px 24px ${shadowColor}`,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '12px',
              }}
            >
              {selectedStadium.foodVendors.map((vendor) => (
                <article
                  key={vendor.id}
                  style={{
                    background: vendorCardBackground,
                    borderRadius: '16px',
                    padding: '16px',
                    minWidth: 0,
                    minHeight: '160px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 800,
                        color: titleColor,
                        marginBottom: '4px',
                        ...lineClampOneStyle(),
                      }}
                    >
                      {vendor.vendor_name}
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: bodyColor,
                        ...lineClampOneStyle(),
                      }}
                    >
                      {vendor.main_menu}
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', fontSize: '12px', fontWeight: 700, color: subtleColor }}>
                    📍 {vendor.location_description}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: '18px', lineHeight: 1.3, marginBottom: '12px', color: titleColor }}>
            🛍️ 공식 굿즈샵
          </h2>

          <div
            style={{
              background: cardBackground,
              borderRadius: '24px',
              padding: '20px 22px',
              boxShadow: `0 8px 24px ${shadowColor}`,
            }}
          >
            {selectedStadium.goodsShops.map((shop, index) => (
              <div key={shop.id}>
                <div style={{ paddingTop: index === 0 ? '0' : '14px', paddingBottom: index === selectedStadium.goodsShops.length - 1 ? '0' : '14px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: titleColor, marginBottom: '8px' }}>
                    {shop.stadium_label}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: bodyColor, marginBottom: '6px' }}>
                    📍 {shop.shop_location}
                  </div>
                  <div style={{ fontSize: '13px', lineHeight: 1.6, color: subtleColor, whiteSpace: 'pre-line' }}>
                    ⏰ {shop.opening_hours}
                  </div>
                </div>

                {index !== selectedStadium.goodsShops.length - 1 ? (
                  <div style={{ height: '1px', background: mutedBackground }} />
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
