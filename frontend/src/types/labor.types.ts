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
  duplex_number: number;
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id: number;
  project_id: number;
  amount: number;
  date: string;
  notes?: string;
  duplex_number: number;
  attachment_paths?: string[];
  attachments?: File[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}
