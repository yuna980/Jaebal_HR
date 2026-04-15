export interface Stadium {
  id: string;
  name: string;
  location: string;
  transport: {
    metro?: string;
    bus?: string;
  };
  restaurants: {
    name: string;
    menu: string;
    description: string;
  }[];
}

export const STADIUMS: Stadium[] = [
  {
    id: 'jamsil',
    name: '잠실 야구장',
    location: '서울특별시 송파구',
    transport: {
      metro: '2, 9호선 종합운동장역 5, 6번 출구',
      bus: '종합운동장 정류장 하차',
    },
    restaurants: [
      { name: '파코메리', menu: '피자', description: '잠실 야구장의 명물 삼겹살 정식과 피콜!' },
      { name: '신철판', menu: '닭강정', description: '바삭하고 달콤한 닭강정, 맥주와 찰떡궁합' },
      { name: '원샷치킨', menu: '치킨+콜라', description: '들고 다니기 편한 컵 치킨' },
    ],
  },
  {
    id: 'gocheok',
    name: '고척 스카이돔',
    location: '서울특별시 구로구',
    transport: {
      metro: '1호선 구일역 2번 출구',
    },
    restaurants: [
      { name: '백남옥달인만두', menu: '만두', description: '고척돔 앞 필수 코스, 얇은 피 만두' },
      { name: '민들레떡볶이', menu: '떡볶이', description: '매콤달콤한 소스가 일품인 즉석 떡볶이' },
    ],
  },
  // Add more stadiums as needed
];
