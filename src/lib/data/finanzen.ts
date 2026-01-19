/**
 * Finanzen Data Layer
 * Phase 2e: Kompletter Finanzen-Lebensbereich
 */

import { createBrowserClient } from '@/lib/supabase';
import { logActivity } from './activity-log';
import { updateFactionStats } from './factions';
import type {
  Account,
  Transaction,
  Investment,
  Budget,
  UserNetWorth,
  UserNetWorthExtended,
  SavingsGoal,
  SavingsGoalProgress,
  FinanceAchievement,
  FinanceStreak,
  NetWorthHistory,
  TransactionCategory,
  MonthlyCashflow,
  MoneyFlowData,
  FinanceSmartTip,
  RecurringFlow,
  RecurringFlowCreate,
} from '@/lib/database.types';

import { getUserIdOrCurrent } from '@/lib/auth-helper';

// DEPRECATED: Will be removed. Use getUserIdOrCurrent() instead
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

// =============================================
// NET WORTH
// =============================================

export async function getNetWorth(): Promise<UserNetWorth | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('user_net_worth')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .maybeSingle();

  if (error) {
    console.error('Error fetching net worth:', error);
    return null;
  }

  return data;
}

export async function getNetWorthExtended(): Promise<UserNetWorthExtended | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('user_net_worth_extended')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .maybeSingle();

  if (error) {
    console.error('Error fetching extended net worth:', error);
    // Fallback to basic net worth
    const basic = await getNetWorth();
    if (basic) {
      return {
        ...basic,
        net_worth_level: calculateNetWorthLevel(basic.net_worth),
      };
    }
    return null;
  }

  return data;
}

export function calculateNetWorthLevel(netWorth: number): number {
  if (netWorth <= 0) return 1;
  return Math.min(100, Math.max(1, Math.floor(Math.log10(netWorth + 1) * 10)));
}

export async function getNetWorthHistory(months: number = 12): Promise<NetWorthHistory[]> {
  const supabase = createBrowserClient();

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const { data, error } = await supabase
    .from('net_worth_history')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .gte('recorded_at', startDate.toISOString().split('T')[0])
    .order('recorded_at', { ascending: true });

  if (error) {
    console.error('Error fetching net worth history:', error);
    return [];
  }

  return data || [];
}

// =============================================
// ACCOUNTS
// =============================================

export async function getAccounts(userId: string = TEST_USER_ID): Promise<Account[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('account_type', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching accounts:', error);
    return [];
  }

  return data || [];
}

export async function getAccountById(id: string): Promise<Account | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching account:', error);
    return null;
  }

  return data;
}

export async function createAccount(account: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Account | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('accounts')
    .insert({
      ...account,
      user_id: TEST_USER_ID,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating account:', error);
    return null;
  }

  return data;
}

export async function updateAccountBalance(id: string, balance: number): Promise<boolean> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('accounts')
    .update({
      current_balance: balance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating account balance:', error);
    return false;
  }

  return true;
}

// =============================================
// TRANSACTIONS
// =============================================

export async function getTransactions(
  options: {
    limit?: number;
    offset?: number;
    accountId?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<Transaction[]> {
  const supabase = createBrowserClient();
  const { limit = 50, offset = 0, accountId, category, startDate, endDate } = options;

  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .order('occurred_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (accountId) {
    query = query.eq('account_id', accountId);
  }

  if (category) {
    query = query.eq('category', category);
  }

  if (startDate) {
    query = query.gte('occurred_at', startDate);
  }

  if (endDate) {
    query = query.lte('occurred_at', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }

  return data || [];
}

export async function getTransactionsByCategory(
  year: number,
  month?: number
): Promise<{ category: string; total: number; type: 'income' | 'expense' }[]> {
  const supabase = createBrowserClient();

  let startDate: string;
  let endDate: string;

  if (month !== undefined) {
    startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  } else {
    startDate = `${year}-01-01`;
    endDate = `${year + 1}-01-01`;
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('category, transaction_type, amount')
    .eq('user_id', TEST_USER_ID)
    .gte('occurred_at', startDate)
    .lt('occurred_at', endDate);

  if (error) {
    console.error('Error fetching transactions by category:', error);
    return [];
  }

  // Aggregate by category
  const aggregated = new Map<string, { total: number; type: 'income' | 'expense' }>();

  for (const tx of data || []) {
    const key = tx.category || 'Sonstiges';
    const existing = aggregated.get(key) || { total: 0, type: tx.transaction_type as 'income' | 'expense' };
    existing.total += Number(tx.amount);
    aggregated.set(key, existing);
  }

  return Array.from(aggregated.entries()).map(([category, { total, type }]) => ({
    category,
    total,
    type,
  }));
}

export async function createTransaction(
  transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at'>,
  userId: string = TEST_USER_ID
): Promise<Transaction | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      ...transaction,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating transaction:', error);
    return null;
  }

  return data;
}

// =============================================
// RECURRING TRANSACTIONS
// =============================================

/**
 * Calculate the next occurrence date based on frequency
 */
function calculateNextDate(current: string, frequency: string): string {
  const date = new Date(current);
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1);
  }
  return date.toISOString().split('T')[0];
}

/**
 * Process all due recurring transactions
 * Creates new transaction instances and updates next_occurrence
 */
export async function processRecurringTransactions(
  userId: string = TEST_USER_ID
): Promise<Transaction[]> {
  const supabase = createBrowserClient();
  const today = new Date().toISOString().split('T')[0];

  // Get all due recurring transactions
  const { data: dueTransactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_recurring', true)
    .lte('next_occurrence', today)
    .or('recurrence_end_date.is.null,recurrence_end_date.gte.' + today);

  if (error) {
    console.error('Error fetching due recurring transactions:', error);
    return [];
  }

  if (!dueTransactions?.length) {
    return [];
  }

  const createdTransactions: Transaction[] = [];

  for (const tx of dueTransactions) {
    // Create new transaction instance (non-recurring copy)
    const newTx = await createTransaction({
      account_id: tx.account_id,
      transaction_type: tx.transaction_type,
      category: tx.category,
      amount: tx.amount,
      description: tx.description,
      occurred_at: tx.next_occurrence,
      to_account_id: tx.to_account_id,
      tags: tx.tags || [],
      is_recurring: false, // The copy is NOT recurring
      recurring_frequency: null,
      next_occurrence: null,
      recurrence_end_date: null,
    });

    if (newTx) {
      createdTransactions.push(newTx);
    }

    // Update next_occurrence on the original recurring transaction
    const nextDate = calculateNextDate(tx.next_occurrence, tx.recurring_frequency);

    // Check if we've passed the end date
    const shouldDeactivate = tx.recurrence_end_date && nextDate > tx.recurrence_end_date;

    await supabase
      .from('transactions')
      .update({
        next_occurrence: shouldDeactivate ? null : nextDate,
        is_recurring: !shouldDeactivate,
      })
      .eq('id', tx.id);
  }

  return createdTransactions;
}

/**
 * Get all recurring transactions (templates)
 */
export async function getRecurringTransactions(
  userId: string = TEST_USER_ID
): Promise<Transaction[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_recurring', true)
    .order('next_occurrence', { ascending: true });

  if (error) {
    console.error('Error fetching recurring transactions:', error);
    return [];
  }

  return data || [];
}

// =============================================
// CASHFLOW
// =============================================

export async function getMonthlyCashflow(year: number, month: number): Promise<MonthlyCashflow> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase.rpc('get_monthly_cashflow', {
    p_user_id: TEST_USER_ID,
    p_year: year,
    p_month: month,
  });

  if (error || !data || data.length === 0) {
    console.error('Error fetching monthly cashflow:', error);
    return {
      income: 0,
      expenses: 0,
      savings: 0,
      investments: 0,
      net: 0,
    };
  }

  return data[0];
}

export async function getCashflowHistory(months: number = 12): Promise<(MonthlyCashflow & { month: string })[]> {
  const result: (MonthlyCashflow & { month: string })[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const cashflow = await getMonthlyCashflow(date.getFullYear(), date.getMonth() + 1);
    result.push({
      ...cashflow,
      month: date.toISOString().substring(0, 7), // YYYY-MM
    });
  }

  return result;
}

// =============================================
// MONEY FLOW (Sankey)
// =============================================

export async function getMoneyFlowData(year: number, month?: number): Promise<MoneyFlowData> {
  const categories = await getTransactionCategories();
  const transactions = await getTransactionsByCategory(year, month);

  const nodes: MoneyFlowData['nodes'] = [];
  const links: MoneyFlowData['links'] = [];

  // Income node
  nodes.push({ id: 'income', name: 'Einkommen', color: '#10B981' });

  // Get income sources
  const incomeCategories = transactions.filter(t => t.type === 'income');
  const expenseCategories = transactions.filter(t => t.type === 'expense');

  // Total income
  const totalIncome = incomeCategories.reduce((sum, c) => sum + c.total, 0);

  // Add income source nodes and links
  for (const ic of incomeCategories) {
    const cat = categories.find(c => c.name === ic.category);
    nodes.push({
      id: `income_${ic.category}`,
      name: ic.category,
      color: cat?.color || '#10B981',
    });
    links.push({
      source: `income_${ic.category}`,
      target: 'income',
      value: ic.total,
    });
  }

  // Add expense category nodes
  for (const ec of expenseCategories) {
    const cat = categories.find(c => c.name === ec.category);
    nodes.push({
      id: `expense_${ec.category}`,
      name: ec.category,
      color: cat?.color || '#6B7280',
    });
    links.push({
      source: 'income',
      target: `expense_${ec.category}`,
      value: ec.total,
    });
  }

  // Remaining (savings)
  const totalExpenses = expenseCategories.reduce((sum, c) => sum + c.total, 0);
  const remaining = totalIncome - totalExpenses;

  if (remaining > 0) {
    nodes.push({ id: 'remaining', name: 'Übrig', color: '#22C55E' });
    links.push({
      source: 'income',
      target: 'remaining',
      value: remaining,
    });
  }

  // Build simplified view data
  const income = incomeCategories.map(ic => ({
    category: ic.category,
    amount: ic.total,
  }));

  const expenses = expenseCategories
    .filter(ec => !['savings', 'investments', 'sparen', 'investieren'].includes(ec.category.toLowerCase()))
    .map(ec => ({
      category: ec.category,
      amount: ec.total,
    }));

  // Find savings and investments categories
  const savingsCategory = expenseCategories.find(ec =>
    ['savings', 'sparen'].includes(ec.category.toLowerCase())
  );
  const investmentsCategory = expenseCategories.find(ec =>
    ['investments', 'investieren'].includes(ec.category.toLowerCase())
  );

  return {
    nodes,
    links,
    income,
    expenses,
    savings: savingsCategory?.total || 0,
    investments: investmentsCategory?.total || 0,
    totalIncome,
    totalExpenses,
  };
}

// =============================================
// TRANSACTION CATEGORIES
// =============================================

export async function getTransactionCategories(): Promise<TransactionCategory[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('transaction_categories')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching transaction categories:', error);
    return [];
  }

  return data || [];
}

// =============================================
// SAVINGS GOALS
// =============================================

/**
 * Calculate XP reward for achieving a savings goal
 * Higher target amounts = more XP
 */
function calculateSavingsGoalXp(goal: { target_amount: number }): number {
  const amount = goal.target_amount;
  if (amount >= 10000) return 150;
  if (amount >= 5000) return 100;
  if (amount >= 1000) return 75;
  if (amount >= 500) return 50;
  return 25;
}

export async function getSavingsGoals(): Promise<SavingsGoal[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching savings goals:', error);
    return [];
  }

  return data || [];
}

export async function getSavingsGoalsWithProgress(): Promise<SavingsGoalProgress[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('savings_goals_progress')
    .select('*')
    .eq('user_id', TEST_USER_ID);

  if (error) {
    console.error('Error fetching savings goals progress:', error);
    // Fallback to manual calculation
    const goals = await getSavingsGoals();
    return goals.map(g => ({
      ...g,
      progress_percent: g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0,
      projected_amount: calculateCompoundInterest(
        g.current_amount,
        g.monthly_contribution,
        g.interest_rate,
        g.compounds_per_year,
        g.target_date ? monthsUntil(g.target_date) : 120
      ),
      days_remaining: g.target_date ? daysUntil(g.target_date) : null,
    }));
  }

  return data || [];
}

export async function createSavingsGoal(
  goal: Omit<SavingsGoal, 'id' | 'user_id' | 'is_achieved' | 'achieved_at' | 'created_at' | 'updated_at'>
): Promise<SavingsGoal | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('savings_goals')
    .insert({
      ...goal,
      user_id: TEST_USER_ID,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating savings goal:', error);
    return null;
  }

  return data;
}

export async function updateSavingsGoalAmount(id: string, amount: number): Promise<boolean> {
  const supabase = createBrowserClient();

  // Get goal's current state BEFORE updating (to check if this is a new achievement)
  const { data: previousGoal } = await supabase
    .from('savings_goals')
    .select('name, target_amount, current_amount, is_achieved')
    .eq('id', id)
    .maybeSingle();

  if (!previousGoal) {
    console.error('Savings goal not found:', id);
    return false;
  }

  const isAchieved = amount >= previousGoal.target_amount;

  const { error } = await supabase
    .from('savings_goals')
    .update({
      current_amount: amount,
      is_achieved: isAchieved,
      achieved_at: isAchieved ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating savings goal:', error);
    return false;
  }

  // Check if goal was JUST achieved (current >= target AND was not previously achieved)
  const justAchieved = isAchieved && !previousGoal.is_achieved;

  if (justAchieved) {
    const xpGained = calculateSavingsGoalXp({ target_amount: previousGoal.target_amount });

    // Update faction stats with XP
    try {
      await updateFactionStats('finanzen', xpGained, TEST_USER_ID);
    } catch (err) {
      console.error('Error updating finanzen faction stats:', err);
    }

    // Log activity for feed
    try {
      await logActivity({
        userId: TEST_USER_ID,
        activityType: 'goal_achieved',
        factionId: 'finanzen',
        title: `Sparziel erreicht: "${previousGoal.name}"`,
        description: `${previousGoal.target_amount.toLocaleString('de-DE')}€ gespart`,
        xpAmount: xpGained,
        relatedEntityType: 'savings_goal',
        relatedEntityId: id,
        metadata: {
          target_amount: previousGoal.target_amount,
          current_amount: amount,
        },
      });
    } catch (err) {
      console.error('Error logging savings goal activity:', err);
    }
  }

  return true;
}

// =============================================
// COMPOUND INTEREST CALCULATOR
// =============================================

export function calculateCompoundInterest(
  principal: number,
  monthlyContribution: number,
  annualRate: number,
  compoundsPerYear: number,
  months: number
): number {
  if (annualRate === 0) {
    return principal + monthlyContribution * months;
  }

  const ratePerPeriod = annualRate / compoundsPerYear;
  const totalPeriods = months;

  // Future Value = P(1+r)^n + PMT * (((1+r)^n - 1) / r)
  const principalGrowth = principal * Math.pow(1 + ratePerPeriod, totalPeriods);
  const contributionGrowth =
    monthlyContribution * ((Math.pow(1 + ratePerPeriod, totalPeriods) - 1) / ratePerPeriod);

  return Math.round((principalGrowth + contributionGrowth) * 100) / 100;
}

export function calculateTimeToGoal(
  currentAmount: number,
  targetAmount: number,
  monthlyContribution: number,
  annualRate: number
): number {
  if (monthlyContribution <= 0 && annualRate <= 0) {
    return Infinity;
  }

  if (annualRate === 0) {
    return Math.ceil((targetAmount - currentAmount) / monthlyContribution);
  }

  // Binary search for months needed
  let low = 0;
  let high = 1200; // 100 years max

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const projected = calculateCompoundInterest(currentAmount, monthlyContribution, annualRate, 12, mid);

    if (projected >= targetAmount) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }

  return low;
}

// =============================================
// FINANCE ACHIEVEMENTS
// =============================================

export async function getFinanceAchievements(): Promise<FinanceAchievement[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('finance_achievements')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .order('unlocked_at', { ascending: false });

  if (error) {
    console.error('Error fetching finance achievements:', error);
    return [];
  }

  return data || [];
}

export async function unlockAchievement(
  key: string,
  title: string,
  description: string,
  icon: string,
  xpReward: number,
  type: string
): Promise<FinanceAchievement | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('finance_achievements')
    .upsert({
      user_id: TEST_USER_ID,
      achievement_key: key,
      achievement_type: type,
      title,
      description,
      icon,
      xp_reward: xpReward,
      is_unlocked: true,
      unlocked_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error unlocking achievement:', error);
    return null;
  }

  return data;
}

// =============================================
// FINANCE STREAKS
// =============================================

export async function getFinanceStreaks(): Promise<FinanceStreak[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('finance_streaks')
    .select('*')
    .eq('user_id', TEST_USER_ID);

  if (error) {
    console.error('Error fetching finance streaks:', error);
    return [];
  }

  return data || [];
}

export async function updateStreak(
  streakType: string,
  success: boolean
): Promise<FinanceStreak | null> {
  const supabase = createBrowserClient();

  // Get current streak
  const { data: current } = await supabase
    .from('finance_streaks')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .eq('streak_type', streakType)
    .maybeSingle();

  const today = new Date().toISOString().split('T')[0];

  if (!current) {
    // Create new streak
    const { data, error } = await supabase
      .from('finance_streaks')
      .insert({
        user_id: TEST_USER_ID,
        streak_type: streakType,
        current_streak: success ? 1 : 0,
        longest_streak: success ? 1 : 0,
        last_checked_date: today,
        last_success_date: success ? today : null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating streak:', error);
      return null;
    }

    return data;
  }

  // Update existing streak
  let newStreak = current.current_streak;
  let longestStreak = current.longest_streak;

  if (success) {
    newStreak += 1;
    longestStreak = Math.max(longestStreak, newStreak);
  } else {
    newStreak = 0;
  }

  const { data, error } = await supabase
    .from('finance_streaks')
    .update({
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_checked_date: today,
      last_success_date: success ? today : current.last_success_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', current.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating streak:', error);
    return null;
  }

  return data;
}

// =============================================
// SMART TIPS
// =============================================

export async function getSmartTips(): Promise<FinanceSmartTip[]> {
  const tips: FinanceSmartTip[] = [];

  const accounts = await getAccounts();
  const netWorth = await getNetWorth();
  const now = new Date();
  const cashflow = await getMonthlyCashflow(now.getFullYear(), now.getMonth() + 1);

  // Tip: Too many accounts
  if (accounts.length > 5) {
    tips.push({
      id: 'too_many_accounts',
      type: 'suggestion',
      icon: '🏦',
      title: 'Viele Konten',
      description: `Du hast ${accounts.length} Konten. Vereinfachung spart Zeit und Gebuhren!`,
    });
  }

  // Tip: Low savings rate
  if (cashflow.income > 0 && cashflow.savings < cashflow.income * 0.1) {
    const savingsRate = ((cashflow.savings / cashflow.income) * 100).toFixed(0);
    tips.push({
      id: 'low_savings',
      type: 'warning',
      icon: '💡',
      title: 'Sparrate erhohen?',
      description: `Deine aktuelle Sparrate ist ${savingsRate}%. Versuche mind. 10-20% zu sparen.`,
    });
  }

  // Tip: Negative cashflow
  if (cashflow.net < 0) {
    tips.push({
      id: 'negative_cashflow',
      type: 'warning',
      icon: '⚠️',
      title: 'Negativer Cashflow',
      description: `Diesen Monat gibst du mehr aus als du einnimmst (${Math.abs(cashflow.net).toFixed(0)}€).`,
    });
  }

  // Tip: High debt
  if (netWorth && netWorth.debt_total > 0) {
    const debtRatio = Math.abs(netWorth.debt_total) / (netWorth.net_worth + Math.abs(netWorth.debt_total));
    if (debtRatio > 0.3) {
      tips.push({
        id: 'high_debt',
        type: 'warning',
        icon: '💳',
        title: 'Schulden abbauen',
        description: 'Dein Schuldenanteil ist hoch. Fokussiere dich auf den Schuldenabbau.',
      });
    }
  }

  // Tip: No investments
  if (netWorth && netWorth.investments_total === 0 && netWorth.net_worth > 5000) {
    tips.push({
      id: 'start_investing',
      type: 'suggestion',
      icon: '📈',
      title: 'Investieren starten?',
      description: 'Du hast noch keine Investments. ETF-Sparen ist ein guter Einstieg!',
    });
  }

  // Positive tip: Good savings
  if (cashflow.income > 0 && cashflow.savings >= cashflow.income * 0.2) {
    tips.push({
      id: 'good_savings',
      type: 'achievement',
      icon: '🎉',
      title: 'Top Sparrate!',
      description: 'Du sparst uber 20% deines Einkommens. Weiter so!',
    });
  }

  return tips;
}

// =============================================
// INVESTMENTS
// =============================================

export async function getInvestments(): Promise<Investment[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching investments:', error);
    return [];
  }

  return data || [];
}

export async function getInvestmentsByAssetType(): Promise<{ type: string; value: number }[]> {
  const investments = await getInvestments();

  const byType = new Map<string, number>();

  for (const inv of investments) {
    const type = inv.asset_type || 'other';
    const value = (inv.quantity || 0) * (inv.current_price || inv.average_cost || 0);
    byType.set(type, (byType.get(type) || 0) + value);
  }

  return Array.from(byType.entries()).map(([type, value]) => ({ type, value }));
}

// =============================================
// BUDGETS
// =============================================

export async function getBudgets(): Promise<Budget[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .eq('is_active', true)
    .order('category', { ascending: true });

  if (error) {
    console.error('Error fetching budgets:', error);
    return [];
  }

  return data || [];
}

export async function getBudgetProgress(
  year: number,
  month: number
): Promise<{ category: string; budget: number; spent: number; remaining: number }[]> {
  const budgets = await getBudgets();
  const transactions = await getTransactionsByCategory(year, month);

  return budgets.map(b => {
    const categoryTx = transactions.find(t => t.category === b.category && t.type === 'expense');
    const spent = categoryTx?.total || 0;

    return {
      category: b.category,
      budget: b.amount,
      spent,
      remaining: b.amount - spent,
    };
  });
}

export async function createBudget(input: {
  category: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
}): Promise<Budget | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('budgets')
    .insert({
      ...input,
      user_id: TEST_USER_ID,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating budget:', error);
    return null;
  }

  return data;
}

export async function updateBudget(
  id: string,
  input: Partial<{ category: string; amount: number; period: 'weekly' | 'monthly' | 'yearly'; is_active: boolean }>
): Promise<Budget | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('budgets')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating budget:', error);
    return null;
  }

  return data;
}

export async function deleteBudget(id: string): Promise<boolean> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('budgets')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    console.error('Error deleting budget:', error);
    return false;
  }

  return true;
}

// =============================================
// RECURRING FLOWS (Daueraufträge)
// =============================================

export async function getRecurringFlows(): Promise<RecurringFlow[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('recurring_flows')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching recurring flows:', error);
    return [];
  }

  return data || [];
}

export async function getRecurringFlowById(id: string): Promise<RecurringFlow | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('recurring_flows')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching recurring flow:', error);
    return null;
  }

  return data;
}

export async function createRecurringFlow(flow: RecurringFlowCreate): Promise<RecurringFlow | null> {
  const supabase = createBrowserClient();

  // Calculate next_due_date based on start_date and frequency
  const startDate = flow.start_date ? new Date(flow.start_date) : new Date();
  const nextDueDate = calculateNextDueDate(startDate, flow.frequency);

  const { data, error } = await supabase
    .from('recurring_flows')
    .insert({
      ...flow,
      user_id: TEST_USER_ID,
      start_date: startDate.toISOString().split('T')[0],
      next_due_date: nextDueDate.toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating recurring flow:', error);
    return null;
  }

  return data;
}

export async function updateRecurringFlow(
  id: string,
  updates: Partial<RecurringFlowCreate>
): Promise<RecurringFlow | null> {
  const supabase = createBrowserClient();

  const updateData: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  // Recalculate next_due_date if frequency changed
  if (updates.frequency) {
    const { data: existing } = await supabase
      .from('recurring_flows')
      .select('start_date')
      .eq('id', id)
      .maybeSingle();

    if (existing) {
      const startDate = updates.start_date ? new Date(updates.start_date) : new Date(existing.start_date);
      updateData.next_due_date = calculateNextDueDate(startDate, updates.frequency).toISOString().split('T')[0];
    }
  }

  const { data, error } = await supabase
    .from('recurring_flows')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating recurring flow:', error);
    return null;
  }

  return data;
}

export async function deleteRecurringFlow(id: string): Promise<boolean> {
  const supabase = createBrowserClient();

  // Soft delete by setting is_active to false
  const { error } = await supabase
    .from('recurring_flows')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Error deleting recurring flow:', error);
    return false;
  }

  return true;
}

export async function hardDeleteRecurringFlow(id: string): Promise<boolean> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('recurring_flows')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error hard deleting recurring flow:', error);
    return false;
  }

  return true;
}

function calculateNextDueDate(startDate: Date, frequency: string): Date {
  const now = new Date();
  const next = new Date(startDate);

  // If start date is in the future, return it
  if (next > now) {
    return next;
  }

  // Calculate the next occurrence based on frequency
  while (next <= now) {
    switch (frequency) {
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'biweekly':
        next.setDate(next.getDate() + 14);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        next.setMonth(next.getMonth() + 1); // Default to monthly
    }
  }

  return next;
}

// =============================================
// CSV IMPORT
// =============================================

export interface CSVTransaction {
  date: string;
  description: string;
  amount: number;
  category?: string;
}

export function parseCSV(csvText: string): CSVTransaction[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(h => h.trim().toLowerCase());
  const transactions: CSVTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';').map(v => v.trim().replace(/"/g, ''));

    const dateIdx = headers.findIndex(h => h.includes('datum') || h.includes('date'));
    const descIdx = headers.findIndex(h => h.includes('beschreibung') || h.includes('verwendung') || h.includes('description'));
    const amountIdx = headers.findIndex(h => h.includes('betrag') || h.includes('amount'));

    if (dateIdx === -1 || amountIdx === -1) continue;

    const amountStr = values[amountIdx]?.replace(/\./g, '').replace(',', '.');
    const amount = parseFloat(amountStr);

    if (isNaN(amount)) continue;

    transactions.push({
      date: values[dateIdx],
      description: values[descIdx] || '',
      amount,
      category: detectCategory(values[descIdx] || ''),
    });
  }

  return transactions;
}

function detectCategory(description: string): string {
  const lower = description.toLowerCase();

  const categoryKeywords: Record<string, string[]> = {
    'Wohnen': ['miete', 'nebenkosten', 'strom', 'gas', 'wasser'],
    'Essen': ['rewe', 'edeka', 'aldi', 'lidl', 'supermarkt', 'restaurant'],
    'Transport': ['tanken', 'benzin', 'bahn', 'mvv', 'uber', 'taxi', 'auto'],
    'Unterhaltung': ['netflix', 'spotify', 'kino', 'theater', 'konzert'],
    'Gesundheit': ['apotheke', 'arzt', 'krankenversicherung', 'fitnessstudio'],
    'Shopping': ['amazon', 'zalando', 'mediamarkt'],
    'Gehalt': ['gehalt', 'lohn', 'salary'],
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return category;
    }
  }

  return 'Sonstiges';
}

export async function importTransactions(
  accountId: string,
  transactions: CSVTransaction[]
): Promise<{ imported: number; skipped: number }> {
  const supabase = createBrowserClient();
  let imported = 0;
  let skipped = 0;

  for (const tx of transactions) {
    // Check for duplicates
    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('account_id', accountId)
      .eq('occurred_at', tx.date)
      .eq('amount', Math.abs(tx.amount))
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    const { error } = await supabase.from('transactions').insert({
      account_id: accountId,
      user_id: TEST_USER_ID,
      transaction_type: tx.amount >= 0 ? 'income' : 'expense',
      category: tx.category,
      amount: Math.abs(tx.amount),
      description: tx.description,
      occurred_at: tx.date,
    });

    if (error) {
      console.error('Error importing transaction:', error);
      skipped++;
    } else {
      imported++;
    }
  }

  return { imported, skipped };
}

// =============================================
// HELPER FUNCTIONS
// =============================================

function monthsUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
