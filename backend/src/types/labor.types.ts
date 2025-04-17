export interface WorkName {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateWorkNameDTO {
  name: string;
}

export interface WorkProject {
  id?: number;
  name: string;
  totalPrice: number;
  duration: number;
  startDate: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id?: number;
  projectId?: number;
  amount: number;
  date: string;
  duplex_number: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}
