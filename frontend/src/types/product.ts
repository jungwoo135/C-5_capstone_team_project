
export interface Seller {
  name: string;
  salesCount: number;
  identityVerified: boolean;
  neighborhoodVerified: boolean;
}

export interface Product {
  id: string;
  title: string;
  detailTitle: string;
  price: number;
  location: string;
  createdAt: string;
  imageUrl: string;
  category: string;
  condition: string;
  description: string;
  seller: Seller;
}
