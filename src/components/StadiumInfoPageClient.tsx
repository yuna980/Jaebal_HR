'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Bus, Car, ChevronDown } from 'lucide-react';
import { useTeam } from '@/context/TeamContext';
import { KBO_TEAMS } from '@/data/teams';
import {
  STADIUM_NAME_BY_TEAM_ID,
  getStadiumDirectionsUrl,
  type StadiumDetail,
} from '@/lib/stadiumInfo';

type StadiumInfoPageClientProps = {
  stadiums: StadiumDetail[];
};

const pageBackground = '#F2F4F6';
const cardBackground = '#FFFFFF';
const mutedBackground = '#F2F4F6';
const titleColor = '#191F28';
const bodyColor = '#4E5968';
const subtleColor = '#8B95A1';
const selectedChipBackground = '#2F3438';
const shadowColor = 'rgba(15, 23, 42, 0.06)';
const teamTabOrder = ['lg', 'doosan', 'ssg', 'lotte', 'kiwoom', 'hanwha', 'kt', 'samsung', 'kia', 'nc'];

const sectionCardStyle: CSSProperties = {
  background: cardBackground,
  borderRadius: '24px',
  boxShadow: `0 8px 24px ${shadowColor}`,
  overflow: 'hidden',
};

const sectionHeaderStyle: CSSProperties = {
  padding: '20px 24px 12px',
};

const sectionSubtitleStyle: CSSProperties = {
  color: '#3182F6',
  fontSize: '13px',
  fontWeight: 800,
  lineHeight: 1.25,
  marginBottom: '4px',
};

const sectionTitleStyle: CSSProperties = {
  color: titleColor,
  fontSize: '21px',
  fontWeight: 800,
  lineHeight: 1.3,
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

function truncateOneLineStyle(): CSSProperties {
  return {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };
}

function StadiumFoodList({
  stadiumName,
  foodVendors,
}: {
  stadiumName: string;
  foodVendors: StadiumDetail['foodVendors'];
}) {
  const [showAllFoods, setShowAllFoods] = useState(false);
  const sortedFoodVendors = [...foodVendors].sort((a, b) => {
    if (a.is_best !== b.is_best) {
      return a.is_best ? -1 : 1;
    }

    return a.display_order - b.display_order;
  });
  const visibleFoodVendors = showAllFoods ? sortedFoodVendors : sortedFoodVendors.slice(0, 3);

  return (
    <section style={{ marginBottom: '16px' }}>
      <div style={sectionCardStyle}>
        <div style={sectionHeaderStyle}>
          <div style={sectionSubtitleStyle}>
            직관 필수 코스
          </div>
          <h2
            style={{
              ...sectionTitleStyle,
              ...truncateOneLineStyle(),
            }}
          >
            {stadiumName} 맛도리 🍔
          </h2>
        </div>

        <div>
          {sortedFoodVendors.length ? (
            visibleFoodVendors.map((vendor, index) => (
              <div key={vendor.id}>
                <button
                  className="stadium-food-list-button"
                  type="button"
                  aria-label={`${vendor.is_best ? 'BEST, ' : ''}${vendor.category || '맛도리'}, ${vendor.vendor_name}, ${vendor.main_menu}, 위치 ${vendor.location_description}`}
                  style={{
                    width: '100%',
                    display: 'block',
                    padding: '18px 24px',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        minWidth: 0,
                        marginBottom: '8px',
                      }}
                    >
                      {vendor.is_best ? (
                        <span
                          style={{
                            flex: '0 0 auto',
                            borderRadius: '999px',
                            background: '#FF3B55',
                            color: '#FFFFFF',
                            fontSize: '11px',
                            fontWeight: 900,
                            lineHeight: 1,
                            padding: '5px 8px',
                          }}
                        >
                          🔥 BEST
                        </span>
                      ) : null}
                      <div
                        style={{
                          flex: '0 0 auto',
                          maxWidth: '120px',
                          borderRadius: '999px',
                          background: '#F2F4F6',
                          color: '#4E5968',
                          fontSize: '11px',
                          fontWeight: 800,
                          lineHeight: 1,
                          padding: '5px 8px',
                          ...truncateOneLineStyle(),
                        }}
                      >
                        {vendor.category || '맛도리'}
                      </div>
                    </div>

                    <div
                      style={{
                        color: titleColor,
                        fontSize: '19px',
                        fontWeight: 900,
                        lineHeight: 1.25,
                        marginBottom: '6px',
                        ...truncateOneLineStyle(),
                      }}
                    >
                      {vendor.vendor_name}
                    </div>

                    <div
                      style={{
                        color: bodyColor,
                        fontSize: '15px',
                        fontWeight: 600,
                        lineHeight: 1.35,
                        marginBottom: '7px',
                        ...truncateOneLineStyle(),
                      }}
                    >
                      {vendor.main_menu}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        minWidth: 0,
                        color: subtleColor,
                        fontSize: '12px',
                        fontWeight: 600,
                        lineHeight: 1.3,
                      }}
                    >
                      <span aria-hidden="true" style={{ opacity: 0.8, flex: '0 0 auto' }}>
                        📍
                      </span>
                      <span style={{ flex: '1 1 auto', minWidth: 0, ...truncateOneLineStyle() }}>
                        {vendor.location_description}
                      </span>
                    </div>
                  </div>
                </button>

                {index !== visibleFoodVendors.length - 1 ? (
                  <div
                    style={{
                      height: '1px',
                      background: '#F2F4F6',
                      marginLeft: '24px',
                      marginRight: '24px',
                  }}
                />
              ) : null}
            </div>
            ))
          ) : (
            <div style={{ padding: '18px 24px 24px', color: subtleColor, fontSize: '13px', fontWeight: 700 }}>
              등록된 맛도리 정보가 없어요.
            </div>
          )}
        </div>

        {sortedFoodVendors.length > 3 ? (
          <div style={{ padding: '12px 24px 24px' }}>
            <button
              className="stadium-food-more-button"
              type="button"
              onClick={() => setShowAllFoods((current) => !current)}
              style={{
                width: '100%',
                borderRadius: '14px',
                background: '#F2F4F6',
                color: '#4E5968',
                fontSize: '14px',
                fontWeight: 800,
                lineHeight: 1,
                padding: '15px 16px',
                textAlign: 'center',
              }}
            >
              {showAllFoods ? '맛집 접기' : '맛집 더보기'}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ParkingLotBanner({ parkingLot }: { parkingLot: StadiumDetail['parkingLots'][number] }) {
  const hasNote = Boolean(parkingLot.note.trim());

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '12px',
        background: '#FFFFFF',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        boxShadow: '0 6px 14px rgba(15, 23, 42, 0.05)',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: '6px',
          background: '#E2E8F0',
        }}
      />

      <div style={{ padding: '14px 14px 14px 22px' }}>
        <div
          style={{
            color: '#334155',
            fontSize: '14px',
            fontWeight: 900,
            lineHeight: 1.35,
            marginBottom: '6px',
            ...lineClampOneStyle(),
          }}
        >
          {parkingLot.parking_location}
        </div>

        <div
          style={{
            color: '#64748B',
            fontSize: '13px',
            fontWeight: 700,
            lineHeight: 1.45,
            whiteSpace: 'pre-line',
          }}
        >
          {parkingLot.fee_description || '요금 정보 확인 필요'}
        </div>

        {hasNote ? (
          <div
            style={{
              borderRadius: '10px',
              background: '#FFF7F7',
              marginTop: '10px',
              padding: '9px 10px',
            }}
          >
            <div
              style={{
                color: '#FF3B55',
                fontSize: '11px',
                fontWeight: 900,
                lineHeight: 1,
                marginBottom: '5px',
              }}
            >
              TIP!
            </div>
            <div
              style={{
                color: '#8B95A1',
                fontSize: '12px',
                fontWeight: 700,
                lineHeight: 1.45,
              whiteSpace: 'pre-line',
            }}
          >
              {parkingLot.note}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ParkingAccordion({
  parkingLots,
  expanded,
  onToggle,
}: {
  parkingLots: StadiumDetail['parkingLots'];
  expanded: boolean;
  onToggle: () => void;
}) {
  if (!parkingLots.length) {
    return (
      <p style={{ color: '#64748B', fontSize: '12px', lineHeight: 1.35 }}>
        등록된 주차 정보가 없어요.
      </p>
    );
  }

  const primaryParkingLot = parkingLots[0];
  const extraParkingLotCount = parkingLots.length - 1;

  if (parkingLots.length === 1) {
    return <ParkingLotBanner parkingLot={primaryParkingLot} />;
  }

  return (
    <div>
      <button
        className="stadium-parking-summary-button"
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gap: '10px',
          alignItems: 'center',
          padding: '2px 0 12px',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            color: '#475569',
            fontSize: '13px',
            fontWeight: 800,
            lineHeight: 1.35,
            minWidth: 0,
            ...truncateOneLineStyle(),
          }}
        >
          {primaryParkingLot.parking_location} 외 {extraParkingLotCount}곳
        </div>

        <span
          aria-hidden="true"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '999px',
            background: '#F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748B',
            flex: '0 0 auto',
          }}
        >
          <ChevronDown
            size={17}
            strokeWidth={2.5}
            style={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 160ms ease',
            }}
          />
        </span>
      </button>

      {expanded ? (
        <>
          <div
            style={{
              height: '1px',
              background: 'rgba(226, 232, 240, 0.9)',
              marginBottom: '12px',
            }}
          />

          <div style={{ display: 'grid', gap: '10px' }}>
            {parkingLots.map((parkingLot) => (
              <ParkingLotBanner key={parkingLot.id} parkingLot={parkingLot} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function StadiumInfoPageClient({ stadiums }: StadiumInfoPageClientProps) {
  const { myTeam } = useTeam();
  const [selectedTeamTabId, setSelectedTeamTabId] = useState('');
  const [parkingExpanded, setParkingExpanded] = useState(false);
  const stadiumNames = new Set(stadiums.map((stadium) => stadium.stadiumName));
  const orderedTeamTabIds = myTeam
    ? [myTeam.id, ...teamTabOrder.filter((teamId) => teamId !== myTeam.id)]
    : teamTabOrder;
  const teamTabs = orderedTeamTabIds
    .map((teamId) => {
      const team = KBO_TEAMS.find((item) => item.id === teamId);
      const stadiumName = STADIUM_NAME_BY_TEAM_ID[teamId];

      if (!team || !stadiumName || !stadiumNames.has(stadiumName)) {
        return null;
      }

      return { team, stadiumName };
    })
    .filter((tab): tab is NonNullable<typeof tab> => Boolean(tab));
  const activeTeamTabId = selectedTeamTabId || myTeam?.id || teamTabs[0]?.team.id || '';
  const activeTeamTab = teamTabs.find((tab) => tab.team.id === activeTeamTabId) ?? teamTabs[0] ?? null;
  const activeStadiumName = activeTeamTab?.stadiumName || stadiums[0]?.stadiumName || '';

  const selectedStadium =
    stadiums.find((stadium) => stadium.stadiumName === activeStadiumName) ?? stadiums[0] ?? null;

  if (!selectedStadium) {
    return null;
  }

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
        <div className="hide-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingTop: '12px', paddingBottom: '2px' }}>
          {teamTabs.map(({ team, stadiumName }) => {
            const selected = team.id === activeTeamTab?.team.id;
            const isMyTeam = team.id === myTeam?.id;

            return (
              <button
                key={team.id}
                onClick={() => {
                  setSelectedTeamTabId(team.id);
                  setParkingExpanded(false);
                }}
                style={{
                  position: 'relative',
                  flex: '0 0 auto',
                  borderRadius: '999px',
                  padding: '10px 14px',
                  background: selected ? selectedChipBackground : mutedBackground,
                  color: selected ? '#FFFFFF' : bodyColor,
                  fontSize: '13px',
                  fontWeight: selected ? 800 : 700,
                  boxShadow: 'none',
                }}
                aria-label={`${team.fullName} 홈구장 ${stadiumName}`}
              >
                {isMyTeam ? (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      borderRadius: '999px',
                      background: '#3182F6',
                      color: '#FFFFFF',
                      fontSize: '9px',
                      fontWeight: 900,
                      lineHeight: 1,
                      padding: '3px 5px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    My Team
                  </span>
                ) : null}
                {team.fullName}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: '22px' }}>
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
              href={getStadiumDirectionsUrl(selectedStadium.stadiumName)}
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
          <div style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <div style={sectionSubtitleStyle}>방문 전 체크</div>
              <h2 style={sectionTitleStyle}>찾아가는 법</h2>
            </div>

            <div style={{ padding: '0 24px 24px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ marginTop: '2px', flex: '0 0 auto' }}>
                  <Bus size={16} color="#64748B" />
                </div>
                <div style={{ width: '100%', minWidth: 0 }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 900, color: '#334155', marginBottom: '4px' }}>
                    대중교통
                  </h3>
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#475569',
                      fontWeight: 700,
                      lineHeight: 1.45,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {selectedStadium.publicTransportDirections || '대중교통 정보 확인 중'}
                  </p>
                </div>
              </div>

              <div style={{ height: '1px', background: '#F2F4F6', margin: '16px 0' }} />

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ marginTop: '2px', flex: '0 0 auto' }}>
                  <Car size={16} color="#64748B" />
                </div>
                <div style={{ width: '100%', minWidth: 0 }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 900, color: '#334155', marginBottom: '8px' }}>
                    주차 정보
                  </h3>
                  <ParkingAccordion
                    parkingLots={selectedStadium.parkingLots}
                    expanded={parkingExpanded}
                    onToggle={() => setParkingExpanded((current) => !current)}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <StadiumFoodList
          key={selectedStadium.stadiumName}
          stadiumName={selectedStadium.stadiumName}
          foodVendors={selectedStadium.foodVendors}
        />

        <section>
          <div style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <div style={sectionSubtitleStyle}>응원 준비</div>
              <h2 style={sectionTitleStyle}>공식 굿즈샵</h2>
            </div>

            <div style={{ padding: '0 24px 24px' }}>
              {selectedStadium.goodsShops.map((shop, index) => (
                <div key={shop.id}>
                  <div style={{ paddingTop: index === 0 ? '0' : '14px', paddingBottom: index === selectedStadium.goodsShops.length - 1 ? '0' : '14px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 900, color: titleColor, marginBottom: '7px' }}>
                      {shop.stadium_label}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: bodyColor, marginBottom: '6px' }}>
                      📍 {shop.shop_location}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.5, color: subtleColor, whiteSpace: 'pre-line' }}>
                      ⏰ {shop.opening_hours}
                    </div>
                  </div>

                  {index !== selectedStadium.goodsShops.length - 1 ? (
                    <div style={{ height: '1px', background: mutedBackground }} />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
