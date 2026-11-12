
import type { Product } from '../types/product';

export const products: Product[] = [
  {
    id: '1',
    title: '가볍게 타는 동네 자전거',
    detailTitle: '두 달 전에 산 자전거 팔아요^^',
    price: 50000,
    location: '금광동',
    createdAt: '5분 전',
    imageUrl:
      'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=900',
    category: '스포츠 / 레저',
    condition: '사용감 있음',
    description:
      '동네에서 타기 좋은 자전거예요. 사용감과 브레이크 상태는 만나서 함께 확인해 주세요. 궁금한 부분은 추가 사진으로 안내할게요.',
    seller: {
      name: '동네친구',
      salesCount: 1,
      identityVerified: true,
      neighborhoodVerified: false,
    },
  },
  {
    id: '2',
    title: '매일 들기 좋은 청색 가방',
    detailTitle: '데일리 청색 가방 판매합니다',
    price: 70000,
    location: '도촌동',
    createdAt: '12분 전',
    imageUrl:
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=900',
    category: '패션 / 잡화',
    condition: '상태 좋음',
    description:
      '평소에 들고 다니기 좋은 가방입니다. 사용 횟수가 적고 전체적으로 상태가 좋아요.',
    seller: {
      name: '가방좋아',
      salesCount: 3,
      identityVerified: true,
      neighborhoodVerified: true,
    },
  },
];

export function getProductById(
  id: string
): Product | undefined {
  return products.find((product) => product.id === id);
}
