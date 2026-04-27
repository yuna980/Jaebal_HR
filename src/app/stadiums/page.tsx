import StadiumInfoPageClient from '@/components/StadiumInfoPageClient';
import type {
  StadiumDetail,
  StadiumFoodVendor,
  StadiumGoodsShop,
  StadiumParkingLot,
} from '@/lib/stadiumInfo';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type StadiumRow = {
  id: number;
  stadium_name: string;
  address: string;
};

type ParkingRow = StadiumParkingLot & {
  stadium_name: string;
};

type FoodRow = StadiumFoodVendor & {
  stadium_name: string;
};

type GoodsRow = StadiumGoodsShop & {
  stadium_name: string;
};

async function getStadiumDetails(): Promise<StadiumDetail[]> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  const [
    { data: stadiumRows, error: stadiumError },
    { data: parkingRows, error: parkingError },
    { data: foodRows, error: foodError },
    { data: goodsRows, error: goodsError },
  ] = await Promise.all([
    supabase.from('stadiums').select('id, stadium_name, address').order('id', { ascending: true }),
    supabase
      .from('stadium_parking_lots')
      .select('id, stadium_name, parking_location, fee_description, note, display_order')
      .order('display_order', { ascending: true }),
    supabase
      .from('stadium_food_vendors')
      .select('id, stadium_name, vendor_name, main_menu, location_description, display_order')
      .order('display_order', { ascending: true }),
    supabase
      .from('stadium_goods_shops')
      .select('id, stadium_name, stadium_label, shop_location, opening_hours, display_order')
      .order('display_order', { ascending: true }),
  ]);

  if (stadiumError || parkingError || foodError || goodsError) {
    console.error(
      '구장정보 페이지 DB 조회 실패:',
      stadiumError?.message ?? parkingError?.message ?? foodError?.message ?? goodsError?.message
    );
    return [];
  }

  const parkingByStadium = new Map<string, StadiumParkingLot[]>();
  const foodByStadium = new Map<string, StadiumFoodVendor[]>();
  const goodsByStadium = new Map<string, StadiumGoodsShop[]>();

  ((parkingRows ?? []) as ParkingRow[]).forEach((row) => {
    const current = parkingByStadium.get(row.stadium_name) ?? [];
    current.push({
      id: row.id,
      parking_location: row.parking_location,
      fee_description: row.fee_description,
      note: row.note,
      display_order: row.display_order,
    });
    parkingByStadium.set(row.stadium_name, current);
  });

  ((foodRows ?? []) as FoodRow[]).forEach((row) => {
    const current = foodByStadium.get(row.stadium_name) ?? [];
    current.push({
      id: row.id,
      vendor_name: row.vendor_name,
      main_menu: row.main_menu,
      location_description: row.location_description,
      display_order: row.display_order,
    });
    foodByStadium.set(row.stadium_name, current);
  });

  ((goodsRows ?? []) as GoodsRow[]).forEach((row) => {
    const current = goodsByStadium.get(row.stadium_name) ?? [];
    current.push({
      id: row.id,
      stadium_label: row.stadium_label,
      shop_location: row.shop_location,
      opening_hours: row.opening_hours,
      display_order: row.display_order,
    });
    goodsByStadium.set(row.stadium_name, current);
  });

  return ((stadiumRows ?? []) as StadiumRow[]).map((stadium) => ({
    id: stadium.id,
    stadiumName: stadium.stadium_name,
    address: stadium.address,
    parkingLots: parkingByStadium.get(stadium.stadium_name) ?? [],
    foodVendors: foodByStadium.get(stadium.stadium_name) ?? [],
    goodsShops: goodsByStadium.get(stadium.stadium_name) ?? [],
  }));
}

export default async function StadiumsPage() {
  const stadiums = await getStadiumDetails();

  if (!stadiums.length) {
    return (
      <div className="container">
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: '24px',
            textAlign: 'center',
            color: 'var(--text-light)',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
          }}
        >
          😢 구장 정보를 아직 불러오지 못했어요.
        </div>
      </div>
    );
  }

  return <StadiumInfoPageClient stadiums={stadiums} />;
}
