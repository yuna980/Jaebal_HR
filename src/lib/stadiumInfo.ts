export type StadiumParkingLot = {
  id: number;
  parking_location: string;
  fee_description: string;
  note: string;
  display_order: number;
};

export type StadiumFoodVendor = {
  id: number;
  vendor_name: string;
  main_menu: string;
  location_description: string;
  display_order: number;
};

export type StadiumGoodsShop = {
  id: number;
  stadium_label: string;
  shop_location: string;
  opening_hours: string;
  display_order: number;
};

export type StadiumDetail = {
  id: number;
  stadiumName: string;
  address: string;
  parkingLots: StadiumParkingLot[];
  foodVendors: StadiumFoodVendor[];
  goodsShops: StadiumGoodsShop[];
};

export const STADIUM_NAME_BY_TEAM_ID: Record<string, string> = {
  lg: '잠실야구장',
  doosan: '잠실야구장',
  kt: 'KT위즈파크',
  ssg: 'SSG랜더스필드',
  nc: '창원NC파크',
  kia: '기아 챔피언스 필드',
  lotte: '사직야구장',
  samsung: '삼성 라이온즈 파크',
  hanwha: '한화생명볼파크',
  kiwoom: '고척스카이돔',
};

const STADIUM_CHIP_LABELS: Record<string, string> = {
  잠실야구장: '잠실',
  SSG랜더스필드: 'SSG',
  사직야구장: '사직',
  고척스카이돔: '고척',
  한화생명볼파크: '한화',
  KT위즈파크: 'KT',
  '삼성 라이온즈 파크': '삼성',
  '기아 챔피언스 필드': 'KIA',
  창원NC파크: 'NC',
};

export function getStadiumChipLabel(stadiumName: string) {
  return STADIUM_CHIP_LABELS[stadiumName] ?? stadiumName;
}

export function getStadiumDirectionsUrl(address: string) {
  return `https://map.naver.com/p/search/${encodeURIComponent(address)}`;
}
