'use client';

import { FileText } from 'lucide-react';

interface InvoiceListProps {
  invoices: any[];
  onAddInvoice: () => void;
}

export function InvoiceList({ invoices, onAddInvoice }: InvoiceListProps) {
  return (
    <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-6">
      <div className="flex items-center gap-3 mb-4">
        <FileText className="w-5 h-5 text-amber-400" />
        <h3 className="text-lg font-semibold">Rechnungen</h3>
      </div>
      <div className="text-center py-8 text-white/50">
        <p>Rechnungs-Feature kommt bald</p>
        <p className="text-sm mt-2">Momentan werden nur Clients und Projekte verwaltet</p>
      </div>
    </div>
  );
}
