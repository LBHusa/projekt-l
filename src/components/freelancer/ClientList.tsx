'use client';

import { motion } from 'framer-motion';
import { Users, Plus, Edit2, Trash2, Mail, Phone, Building } from 'lucide-react';
import type { FreelanceClient } from '@/lib/database.types';

interface ClientListProps {
  clients: FreelanceClient[];
  onAddClient: () => void;
  onEditClient: (client: FreelanceClient) => void;
  onDeleteClient: (clientId: string) => void;
}

export function ClientList({ clients, onAddClient, onEditClient, onDeleteClient }: ClientListProps) {
  return (
    <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Kunden</h3>
            <p className="text-sm text-white/50">{clients.length} gesamt</p>
          </div>
        </div>
        <button
          onClick={onAddClient}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Neuer Kunde</span>
        </button>
      </div>

      {/* Client List */}
      {clients.length === 0 ? (
        <div className="text-center py-12 text-white/50">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Noch keine Kunden hinzugefügt</p>
          <button
            onClick={onAddClient}
            className="mt-4 text-amber-400 hover:text-amber-300 transition-colors"
          >
            Ersten Kunden anlegen
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((client, index) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-[var(--background-tertiary)] rounded-lg p-4 border ${
                client.is_active ? 'border-amber-500/20' : 'border-white/10'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{client.name}</h4>
                    {!client.is_active && (
                      <span className="px-2 py-0.5 rounded text-xs bg-white/10 text-white/50">
                        Inaktiv
                      </span>
                    )}
                  </div>

                  {client.company_info && (
                    <div className="flex items-center gap-2 text-sm text-white/60 mb-1">
                      <Building className="w-3.5 h-3.5" />
                      {client.company_info}
                    </div>
                  )}

                  {client.contact_email && (
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <Mail className="w-3.5 h-3.5" />
                      <a
                        href={`mailto:${client.contact_email}`}
                        className="hover:text-amber-400 transition-colors"
                      >
                        {client.contact_email}
                      </a>
                    </div>
                  )}

                  {client.contact_phone && (
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <Phone className="w-3.5 h-3.5" />
                      <a
                        href={`tel:${client.contact_phone}`}
                        className="hover:text-amber-400 transition-colors"
                      >
                        {client.contact_phone}
                      </a>
                    </div>
                  )}

                  {client.notes && (
                    <p className="text-sm text-white/50 mt-2 italic">
                      {client.notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => onEditClient(client)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    title="Bearbeiten"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Kunde "${client.name}" wirklich löschen?`)) {
                        onDeleteClient(client.id);
                      }
                    }}
                    className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-red-400 transition-colors"
                    title="Löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
