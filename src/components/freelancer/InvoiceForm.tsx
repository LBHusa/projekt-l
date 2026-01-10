'use client';

export interface InvoiceFormData {
  project_id?: string | null;
  invoice_number?: string | null;
  amount: number;
  currency?: string;
  status?: string;
  issue_date: string;
  due_date: string;
  notes?: string | null;
}

interface InvoiceFormProps {
  invoice?: any;
  projects: any[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InvoiceFormData) => Promise<void>;
}

export function InvoiceForm({ invoice, projects, isOpen, onClose, onSubmit }: InvoiceFormProps) {
  // Placeholder - wird später implementiert
  return null;
}
