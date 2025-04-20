export type TimePeriod = 'day' | 'week' | 'month';

export interface PurchaseFilters {
  name?: string;
  duplexNumber?: number;
  startDate?: string;
  endDate?: string;
  period?: TimePeriod;
  type?: PurchaseType;
}

export interface Purchase {
  id?: number;
  name: string;
  duplex_number: number;  
  type: string;
  purchase_date: string;  
  price: number | string;         
  notes?: string;
  attachment_paths?: string[];
  created_by?: string;
  created_at?: string;
}

export enum PurchaseType {
  Furniture = 'Furniture',
  Electronics = 'Electronics',
  Construction = 'Construction',
  Miscellaneous = 'Miscellaneous',
  Cement = 'Cement',
  Sand = 'Sand',
  Water = 'Water',
  Pulp = 'Pulp'
}

export const PurchaseTypeTranslations: Record<PurchaseType, { en: string; ar: string }> = {
  [PurchaseType.Furniture]: { en: 'Furniture', ar: 'أثاث' },
  [PurchaseType.Electronics]: { en: 'Electronics', ar: 'إلكترونيات' },
  [PurchaseType.Construction]: { en: 'Construction', ar: 'مواد البناء' },
  [PurchaseType.Miscellaneous]: { en: 'Miscellaneous', ar: 'متنوع' },
  [PurchaseType.Cement]: { en: 'Cement', ar: 'اسمنت' },
  [PurchaseType.Sand]: { en: 'Sand', ar: 'رمل' },
  [PurchaseType.Water]: { en: 'Water', ar: 'ماء' },
  [PurchaseType.Pulp]: { en: 'Pulp', ar: 'لمبات' }
};

export type CreatePurchaseDTO = Omit<Purchase, 'id' | 'created_by' | 'created_at'>;

export interface APIResponse {
  success: boolean;
  message?: string;
  id?: number;
  error?: string;
  data?: any;
}
