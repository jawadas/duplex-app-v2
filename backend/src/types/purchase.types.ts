export interface Purchase {
    id?: number;
    name: string;
    duplexNumber: number;
    type: string;
    purchaseDate: Date;
    price: number;
    notes?: string;
  }