'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, PiggyBank, Target, Plus, Upload } from 'lucide-react';
import { FactionPageHeader, FactionStatsBar, FactionSkillsSection } from '@/components/factions';
import {
  NetWorthWidget,
  AccountsList,
  MoneyFlowCanvas,
  CashflowSummary,
  SavingsGoalsList,
  CompoundInterestCalculator,
  FinanceAchievements,
  SavingsStreak,
  SmartTips,
  CSVImport,
  AccountForm,
  SavingsGoalForm,
  TransactionForm,
  RecurringFlowForm,
  BudgetCard,
  BudgetsList,
  BudgetForm,
} from '@/components/finanzen';
import type { AccountFormData, SavingsGoalFormData, TransactionFormData, RecurringFlowFormData, BudgetFormData } from '@/components/finanzen';
import { getFaction, getUserFactionStat } from '@/lib/data/factions';
import {
  getNetWorthExtended,
  getAccounts,
  getMonthlyCashflow,
  getMoneyFlowData,
  getSavingsGoalsWithProgress,
  getFinanceAchievements,
  getFinanceStreaks,
  getSmartTips,
  importTransactions,
  createAccount,
  createSavingsGoal,
  createTransaction,
  getRecurringFlows,
  createRecurringFlow,
  getBudgetProgress,
  createBudget,
  updateBudget,
} from '@/lib/data/finanzen';
import type {
  FactionWithStats,
  Account,
  MonthlyCashflow,
  MoneyFlowData,
  SavingsGoalProgress,
  FinanceAchievement,
  FinanceStreak,
  FinanceSmartTip,
  UserNetWorthExtended,
  RecurringFlow,
  Budget,
} from '@/lib/database.types';

export default function FinanzenPage() {
  const [faction, setFaction] = useState<FactionWithStats | null>(null);
  const [netWorth, setNetWorth] = useState<UserNetWorthExtended | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cashflow, setCashflow] = useState<MonthlyCashflow | null>(null);
  const [moneyFlow, setMoneyFlow] = useState<MoneyFlowData | null>(null);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoalProgress[]>([]);
  const [recurringFlows, setRecurringFlows] = useState<RecurringFlow[]>([]);
  const [achievements, setAchievements] = useState<FinanceAchievement[]>([]);
  const [streaks, setStreaks] = useState<FinanceStreak[]>([]);
  const [tips, setTips] = useState<FinanceSmartTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showSavingsGoalForm, setShowSavingsGoalForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showRecurringFlowForm, setShowRecurringFlowForm] = useState(false);
  const [budgets, setBudgets] = useState<{ category: string; budget: number; spent: number; remaining: number }[]>([]);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [budgetPeriod, setBudgetPeriod] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');

  const loadData = async () => {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // 1-12

      const [
        factionData,
        factionStats,
        netWorthData,
        accountsData,
        cashflowData,
        moneyFlowData,
        goalsData,
        recurringFlowsData,
        achievementsData,
        streaksData,
        tipsData,
        budgetData,
      ] = await Promise.all([
        getFaction('finanzen'),
        getUserFactionStat('finanzen'),
        getNetWorthExtended(),
        getAccounts(),
        getMonthlyCashflow(currentYear, currentMonth),
        getMoneyFlowData(currentYear, currentMonth),
        getSavingsGoalsWithProgress(),
        getRecurringFlows(),
        getFinanceAchievements(),
        getFinanceStreaks(),
        getSmartTips(),
        getBudgetProgress(currentYear, currentMonth),
      ]);

      if (factionData) {
        setFaction({
          ...factionData,
          stats: factionStats,
        });
      }

      setNetWorth(netWorthData);
      setAccounts(accountsData);
      setCashflow(cashflowData);
      setMoneyFlow(moneyFlowData);
      setSavingsGoals(goalsData);
      setRecurringFlows(recurringFlowsData);
      setAchievements(achievementsData);
      setStreaks(streaksData);
      setTips(tipsData);
      setBudgets(budgetData);
    } catch (err) {
      console.error('Error loading finanzen data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCSVImport = async (transactions: { date: string; description: string; amount: number; category?: string; isIncome: boolean }[]) => {
    if (!selectedAccountId) return;

    await importTransactions(selectedAccountId, transactions.map(t => ({
      date: t.date,
      description: t.description,
      amount: t.isIncome ? t.amount : -t.amount,
      category: t.category || (t.isIncome ? 'other_income' : 'other_expense'),
    })));

    await loadData();
  };

  const handleAccountSubmit = async (data: AccountFormData) => {
    await createAccount({
      name: data.name,
      account_type: data.account_type,
      institution: data.institution || null,
      currency: data.currency,
      current_balance: data.current_balance,
      is_active: true,
      is_excluded_from_net_worth: data.is_excluded_from_net_worth,
      icon: data.icon || null,
      color: data.color || null,
      credit_limit: data.credit_limit || null,
      interest_rate: data.interest_rate || null,
    });
    setShowAccountForm(false);
    await loadData();
  };

  const handleSavingsGoalSubmit = async (data: SavingsGoalFormData) => {
    await createSavingsGoal({
      name: data.name,
      description: data.description || null,
      icon: data.icon,
      color: data.color,
      target_amount: data.target_amount,
      current_amount: data.current_amount,
      monthly_contribution: data.monthly_contribution,
      interest_rate: data.interest_rate,
      compounds_per_year: data.compounds_per_year,
      start_date: new Date().toISOString().split('T')[0],
      target_date: data.target_date || null,
      xp_reward: data.xp_reward,
    });
    setShowSavingsGoalForm(false);
    await loadData();
  };

  const handleTransactionSubmit = async (data: TransactionFormData) => {
    await createTransaction({
      account_id: data.account_id,
      transaction_type: data.transaction_type,
      category: data.category,
      amount: data.amount,
      description: data.description || null,
      occurred_at: data.occurred_at,
      to_account_id: data.to_account_id || null,
      tags: [],
      is_recurring: data.is_recurring,
      recurring_frequency: data.recurring_frequency || null,
    });
    setShowTransactionForm(false);
    await loadData();
  };

  const handleRecurringFlowSubmit = async (data: RecurringFlowFormData) => {
    await createRecurringFlow({
      source_type: data.source_type,
      source_id: data.source_id || null,
      source_category: data.source_category || null,
      target_type: data.target_type,
      target_id: data.target_id || null,
      target_category: data.target_category || null,
      amount: data.amount,
      frequency: data.frequency,
      name: data.name,
      description: data.description || null,
      start_date: data.start_date,
      end_date: data.end_date || null,
    });
    setShowRecurringFlowForm(false);
    await loadData();
  };

  const handleBudgetSubmit = async (data: BudgetFormData) => {
    if (editingBudget) {
      await updateBudget(editingBudget.id, {
        category: data.category,
        amount: data.amount,
        period: data.period,
      });
      setEditingBudget(null);
    } else {
      await createBudget({
        category: data.category,
        amount: data.amount,
        period: data.period,
      });
      setShowBudgetForm(false);
    }
    await loadData();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 animate-pulse mx-auto mb-4 flex items-center justify-center">
            <Wallet className="w-8 h-8 text-emerald-400" />
          </div>
          <p className="text-white/50">Lade Finanzen-Daten...</p>
        </div>
      </div>
    );
  }

  if (!faction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-400">
          Finanzen-Bereich nicht gefunden
        </div>
      </div>
    );
  }

  // Additional stats for the stats bar
  const additionalStats = [];
  if (netWorth) {
    additionalStats.push({
      label: 'Vermogen',
      value: formatCurrency(netWorth.net_worth),
      icon: <Wallet className="w-4 h-4" />,
      color: 'text-emerald-400',
    });
  }
  if (savingsGoals.length > 0) {
    const activeGoals = savingsGoals.filter(g => !g.is_achieved).length;
    additionalStats.push({
      label: 'Sparziele',
      value: `${activeGoals} aktiv`,
      icon: <Target className="w-4 h-4" />,
      color: 'text-blue-400',
    });
  }
  if (cashflow && cashflow.income > 0) {
    const savingsRate = ((cashflow.savings + cashflow.investments) / cashflow.income * 100).toFixed(0);
    additionalStats.push({
      label: 'Sparrate',
      value: `${savingsRate}%`,
      icon: <PiggyBank className="w-4 h-4" />,
      color: Number(savingsRate) >= 20 ? 'text-green-400' : 'text-yellow-400',
    });
  }

  return (
    <div className="min-h-screen">
      <FactionPageHeader faction={faction} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Bar */}
        <div className="mb-8">
          <FactionStatsBar
            faction={faction}
            skillCount={0}
            additionalStats={additionalStats}
          />
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2 mb-6"
        >
          <button
            onClick={() => {
              if (accounts.length > 0) {
                setSelectedAccountId(accounts[0].id);
                setShowCSVImport(true);
              }
            }}
            disabled={accounts.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            CSV Import
          </button>
          <button
            onClick={() => setShowAccountForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Konto hinzufugen
          </button>
          <button
            onClick={() => setShowSavingsGoalForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-sm transition-colors"
          >
            <Target className="w-4 h-4" />
            Sparziel erstellen
          </button>
          <button
            onClick={() => setShowTransactionForm(true)}
            disabled={accounts.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TrendingUp className="w-4 h-4" />
            Transaktion
          </button>
        </motion.div>

        {/* Net Worth Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <NetWorthWidget netWorth={netWorth} />
        </motion.div>

        {/* Money Flow Canvas - Full Width */}
        {moneyFlow && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <MoneyFlowCanvas
              data={moneyFlow}
              accounts={accounts}
              goals={savingsGoals}
              recurringFlows={recurringFlows}
              onAddAccount={() => setShowAccountForm(true)}
              onAddSavingsGoal={() => setShowSavingsGoalForm(true)}
              onAddRecurringFlow={() => setShowRecurringFlowForm(true)}
              onAddTransaction={() => setShowTransactionForm(true)}
            />
          </motion.div>
        )}

        {/* Konten, Sparziele, Streaks - 3 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Accounts List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-5 h-5 text-emerald-400" />
              <h2 className="font-semibold">Konten</h2>
            </div>
            <AccountsList accounts={accounts} />
          </motion.div>

          {/* Savings Goals */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-blue-400" />
              <h2 className="font-semibold">Sparziele</h2>
            </div>
            <SavingsGoalsList goals={savingsGoals} />
          </motion.div>

          {/* Streaks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <SavingsStreak streaks={streaks} />
          </motion.div>
        </div>

        {/* Cashflow & Calculator - 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Cashflow Summary */}
          {cashflow && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <CashflowSummary
                cashflow={cashflow}
                month={new Date().toISOString().slice(0, 7)}
              />
            </motion.div>
          )}

          {/* Compound Interest Calculator */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <CompoundInterestCalculator />
          </motion.div>
        </div>

        {/* Budgets Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
          className="mb-6"
        >
          <div className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4">
            <BudgetsList
              budgets={budgets.filter(b => b.budget > 0)}
              period={budgetPeriod}
              onCreateBudget={() => setShowBudgetForm(true)}
              onBudgetClick={(budget) => {
                console.log('Budget clicked:', budget);
              }}
            />
          </div>
        </motion.div>

        {/* Smart Tips & Achievements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Smart Tips */}
          {tips.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <SmartTips tips={tips} />
            </motion.div>
          )}

          {/* Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
          >
            <FinanceAchievements
              achievements={achievements}
              netWorth={netWorth?.net_worth || 0}
            />
          </motion.div>
        </div>

        {/* Skills Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="bg-[var(--background-secondary)]/80 backdrop-blur-sm rounded-xl border border-[var(--orb-border)] p-4"
        >
          <FactionSkillsSection
            factionId="finanzen"
            factionColor={faction.color}
          />
        </motion.div>
      </main>

      {/* CSV Import Modal */}
      {showCSVImport && selectedAccountId && (
        <CSVImport
          accountId={selectedAccountId}
          onImport={handleCSVImport}
          onClose={() => setShowCSVImport(false)}
        />
      )}

      {/* Account Form Modal */}
      {showAccountForm && (
        <AccountForm
          onSubmit={handleAccountSubmit}
          onCancel={() => setShowAccountForm(false)}
        />
      )}

      {/* Savings Goal Form Modal */}
      {showSavingsGoalForm && (
        <SavingsGoalForm
          onSubmit={handleSavingsGoalSubmit}
          onCancel={() => setShowSavingsGoalForm(false)}
        />
      )}

      {/* Transaction Form Modal */}
      {showTransactionForm && accounts.length > 0 && (
        <TransactionForm
          accounts={accounts}
          onSubmit={handleTransactionSubmit}
          onCancel={() => setShowTransactionForm(false)}
        />
      )}

      {/* Recurring Flow Form Modal */}
      {showRecurringFlowForm && (
        <RecurringFlowForm
          accounts={accounts}
          savingsGoals={savingsGoals}
          onSubmit={handleRecurringFlowSubmit}
          onCancel={() => setShowRecurringFlowForm(false)}
        />
      )}

      {/* Budget Form Modal */}
      {showBudgetForm && (
        <BudgetForm
          onSubmit={handleBudgetSubmit}
          onCancel={() => setShowBudgetForm(false)}
        />
      )}

      {/* Edit Budget Modal */}
      {editingBudget && (
        <BudgetForm
          budget={editingBudget}
          onSubmit={handleBudgetSubmit}
          onCancel={() => setEditingBudget(null)}
        />
      )}
    </div>
  );
}
