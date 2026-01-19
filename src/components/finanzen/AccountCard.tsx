'use client';

import { Building2, Wallet, CreditCard, LineChart, Bitcoin, Banknote, Landmark } from 'lucide-react';
import type { Account, AccountType } from '@/lib/database.types';

interface AccountCardProps {
  account: Account;
  onClick?: () => void;
}

const ACCOUNT_TYPE_CONFIG: Record<AccountType, { icon: React.ReactNode; color: string; label: string }> = {
  checking: { icon: <Building2 className="w-5 h-5" />, color: 'text-blue-400', label: 'Girokonto' },
  savings: { icon: <Landmark className="w-5 h-5" />, color: 'text-green-400', label: 'Sparkonto' },
  credit: { icon: <CreditCard className="w-5 h-5" />, color: 'text-red-400', label: 'Kreditkarte' },
  investment: { icon: <LineChart className="w-5 h-5" />, color: 'text-purple-400', label: 'Depot' },
  crypto: { icon: <Bitcoin className="w-5 h-5" />, color: 'text-orange-400', label: 'Crypto' },
  cash: { icon: <Banknote className="w-5 h-5" />, color: 'text-emerald-400', label: 'Bargeld' },
  loan: { icon: <Wallet className="w-5 h-5" />, color: 'text-rose-400', label: 'Kredit' },
};

export function AccountCard({ account, onClick }: AccountCardProps) {
  const config = ACCOUNT_TYPE_CONFIG[account.account_type] || ACCOUNT_TYPE_CONFIG.checking;
  const isNegative = account.current_balance < 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: account.currency || 'EUR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-all ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center`}
            style={{ backgroundColor: account.color ? `${account.color}20` : 'rgba(255,255,255,0.1)' }}
          >
            <span className={config.color}>{config.icon}</span>
          </div>
          <div>
            <h3 className="font-medium">{account.name}</h3>
            <p className="text-xs text-adaptive-dim">
              {config.label}
              {account.institution && ` • ${account.institution}`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-lg font-semibold ${isNegative ? 'text-red-400' : config.color}`}>
            {formatCurrency(account.current_balance)}
          </p>
          {account.credit_limit && (
            <p className="text-xs text-adaptive-dim">
              Limit: {formatCurrency(account.credit_limit)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface AccountsListProps {
  accounts: Account[];
  onAccountClick?: (account: Account) => void;
}

export function AccountsList({ accounts, onAccountClick }: AccountsListProps) {
  // Group accounts by type
  const groupedAccounts = accounts.reduce((acc, account) => {
    const type = account.account_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(account);
    return acc;
  }, {} as Record<string, Account[]>);

  const typeOrder: AccountType[] = ['checking', 'savings', 'investment', 'crypto', 'cash', 'credit', 'loan'];

  return (
    <div className="space-y-4">
      {typeOrder.map(type => {
        const typeAccounts = groupedAccounts[type];
        if (!typeAccounts?.length) return null;

        const config = ACCOUNT_TYPE_CONFIG[type];

        return (
          <div key={type}>
            <h3 className={`text-sm font-medium ${config.color} mb-2`}>
              {config.label} ({typeAccounts.length})
            </h3>
            <div className="space-y-2">
              {typeAccounts.map(account => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onClick={onAccountClick ? () => onAccountClick(account) : undefined}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
