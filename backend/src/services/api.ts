import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = `${process.env.API_BASE_URL}${process.env.API_PREFIX}` || 'http://localhost:3000/';

export interface PurchaseData {
  name: string;
  duplex_number: number;
  type: string;
  purchase_date: string;
  price: number;
  notes?: string;
  created_by?: string;
  attachment?: string;
}

export const createPurchase = async (purchaseData: PurchaseData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(purchaseData),
    });

    if (!response.ok) {
      throw new Error('Failed to create purchase');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating purchase:', error);
    throw error;
  }
};