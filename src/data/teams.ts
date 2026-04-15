export interface Team {
  id: string;
  name: string;
  fullName: string;
  color: string;
  bgSecondary: string;
  stadium: string;
  logo: string;
}

export const KBO_TEAMS: Team[] = [
  {
    id: 'lg',
    name: 'LG',
    fullName: 'LG 트윈스',
    color: '#C30452',
    bgSecondary: '#F7E7ED',
    stadium: '잠실 야구장',
    logo: '⚾️',
  },
  {
    id: 'kt',
    name: 'KT',
    fullName: 'KT 위즈',
    color: '#000000',
    bgSecondary: '#EEEEEE',
    stadium: '수원 KT 위즈 파크',
    logo: '🪄',
  },
  {
    id: 'ssg',
    name: 'SSG',
    fullName: 'SSG 랜더스',
    color: '#CE0E2D',
    bgSecondary: '#F9E7E9',
    stadium: '인천 SSG 랜더스 필드',
    logo: '🚀',
  },
  {
    id: 'nc',
    name: 'NC',
    fullName: 'NC 다이노스',
    color: '#315288',
    bgSecondary: '#EAEFF6',
    stadium: '창원 NC 파크',
    logo: '🦖',
  },
  {
    id: 'doosan',
    name: '두산',
    fullName: '두산 베어스',
    color: '#131230',
    bgSecondary: '#E7E7EB',
    stadium: '잠실 야구장',
    logo: '🐻',
  },
  {
    id: 'kia',
    name: 'KIA',
    fullName: 'KIA 타이거즈',
    color: '#EA0029',
    bgSecondary: '#FDE6EA',
    stadium: '광주 기아 챔피언스 필드',
    logo: '🐯',
  },
  {
    id: 'lotte',
    name: '롯데',
    fullName: '롯데 자이언츠',
    color: '#002955',
    bgSecondary: '#E6EAEF',
    stadium: '사직 야구장',
    logo: '⚓️',
  },
  {
    id: 'samsung',
    name: '삼성',
    fullName: '삼성 라이온즈',
    color: '#074CA1',
    bgSecondary: '#E6EDF6',
    stadium: '대구 삼성 라이온즈 파크',
    logo: '🦁',
  },
  {
    id: 'hanwha',
    name: '한화',
    fullName: '한화 이글스',
    color: '#F37321',
    bgSecondary: '#FEF1E9',
    stadium: '대전 한화생명 이글스 파크',
    logo: '🦅',
  },
  {
    id: 'kiwoom',
    name: '키움',
    fullName: '키움 히어로즈',
    color: '#820024',
    bgSecondary: '#F2E6E9',
    stadium: '고척 스카이돔',
    logo: '🦸',
  },
];
