import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { format, addMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
import api from '../api';

// Money interfaces
interface Category { id: number; name: string; type: 'income' | 'expense'; budget_limit: number | null; color: string; }
interface Transaction { id: number; amount: number; description: string; date: string; type: 'income' | 'expense'; category_name: string; category_color: string; }
interface Summary { income: number; expense: number; net: number; }

// Finance interfaces
interface FinancialGoal { id: number; title: string; description: string; target_amount: number; current_amount: number; created_at: string; }
interface HistoryEntry { id: number; amount: number; note: string; recorded_at: string; }
interface Projection { avg_monthly_net: number; months: { year: number; month: number; income: number; expense: number }[]; }
interface Debt { id: number; title: string; debt_type: string; original_amount: number; current_balance: number; interest_rate: number; minimum_payment: number; created_at: string; }
interface DebtHistory { id: number; balance: number; note: string; recorded_at: string; }
interface UpcomingCash { id: number; title: string; amount: number; expected_date: string; }

const COLORS = ['#FBBF24', '#E8A840', '#F09060', '#EAD050', '#D4884C', '#F5B830', '#F07050'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DEBT_TYPES = ['Credit Card', 'Student Loan', 'Car Loan', 'Personal Loan', 'Medical', 'Other'];

export default function Money() {
  const now = new Date();

  // Money state
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary>({ income: 0, expense: 0, net: 0 });
  const [subTab, setSubTab] = useState<'transactions' | 'categories'>('transactions');
  const [showTxForm, setShowTxForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [txForm, setTxForm] = useState({ category_id: '', amount: '', description: '', date: format(now, 'yyyy-MM-dd'), type: 'expense' as 'income' | 'expense' });
  const [catForm, setCatForm] = useState({ name: '', type: 'expense' as 'income' | 'expense', budget_limit: '', color: '#FBBF24' });

  // Finance state
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [histories, setHistories] = useState<Record<number, HistoryEntry[]>>({});
  const [projection, setProjection] = useState<Projection>({ avg_monthly_net: 0, months: [] });
  const [debts, setDebts] = useState<Debt[]>([]);
  const [debtHistories, setDebtHistories] = useState<Record<number, DebtHistory[]>>({});
  const [upcoming, setUpcoming] = useState<UpcomingCash[]>([]);
  const [showUpdateGoal, setShowUpdateGoal] = useState<FinancialGoal | null>(null);
  const [showUpdateDebt, setShowUpdateDebt] = useState<Debt | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [showAddUpcoming, setShowAddUpcoming] = useState(false);
  const [updateAmount, setUpdateAmount] = useState('');
  const [updateNote, setUpdateNote] = useState('');
  const [newGoal, setNewGoal] = useState({ title: '', description: '', target_amount: '', current_amount: '' });
  const [newDebt, setNewDebt] = useState({ title: '', debt_type: 'Credit Card', original_amount: '', current_balance: '' });
  const [newUpcoming, setNewUpcoming] = useState({ title: '', amount: '', expected_date: '' });

  // Main tab
  const [mainTab, setMainTab] = useState<'transactions' | 'savings'>('transactions');

  const fetchMoney = async () => {
    const [cats, txs, sum] = await Promise.all([
      api.get('/money/categories'),
      api.get(`/money/transactions?month=${month}&year=${year}`),
      api.get(`/money/summary?month=${month}&year=${year}`),
    ]);
    setCategories(cats.data);
    setTransactions(txs.data);
    setSummary(sum.data);
  };

  const fetchFinance = async () => {
    const [g, p, d, u] = await Promise.all([
      api.get('/finance/goals'),
      api.get('/finance/projection'),
      api.get('/finance/debts'),
      api.get('/finance/upcoming'),
    ]);
    setGoals(g.data);
    setProjection(p.data);
    setDebts(d.data);
    setUpcoming(u.data);

    const hist: Record<number, HistoryEntry[]> = {};
    await Promise.all(g.data.map(async (goal: FinancialGoal) => {
      const res = await api.get(`/finance/goals/${goal.id}/history`);
      hist[goal.id] = res.data;
    }));
    setHistories(hist);

    const dHist: Record<number, DebtHistory[]> = {};
    await Promise.all(d.data.map(async (debt: Debt) => {
      const res = await api.get(`/finance/debts/${debt.id}/history`);
      dHist[debt.id] = res.data;
    }));
    setDebtHistories(dHist);
  };

  useEffect(() => { fetchMoney(); }, [month, year]);
  useEffect(() => { fetchFinance(); }, []);

  // Money handlers
  const handleAddTx = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/money/transactions', { ...txForm, category_id: txForm.category_id || null });
    setShowTxForm(false);
    setTxForm({ category_id: '', amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), type: 'expense' });
    fetchMoney();
  };

  const handleDeleteTx = async (id: number) => {
    await api.delete(`/money/transactions/${id}`);
    fetchMoney();
  };

  const handleAddCat = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/money/categories', { ...catForm, budget_limit: catForm.budget_limit || null });
    setShowCatForm(false);
    setCatForm({ name: '', type: 'expense', budget_limit: '', color: '#FBBF24' });
    fetchMoney();
  };

  const handleDeleteCat = async (id: number) => {
    if (!confirm('Delete this category?')) return;
    await api.delete(`/money/categories/${id}`);
    fetchMoney();
  };

  // Finance handlers
  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showUpdateGoal) return;
    await api.post(`/finance/goals/${showUpdateGoal.id}/history`, { amount: parseFloat(updateAmount), note: updateNote });
    setShowUpdateGoal(null); setUpdateAmount(''); setUpdateNote('');
    fetchFinance();
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/finance/goals', { ...newGoal, target_amount: parseFloat(newGoal.target_amount), current_amount: parseFloat(newGoal.current_amount) || 0 });
    setShowAddGoal(false);
    setNewGoal({ title: '', description: '', target_amount: '', current_amount: '' });
    fetchFinance();
  };

  const handleDeleteGoal = async (id: number) => {
    if (!confirm('Delete this financial goal?')) return;
    await api.delete(`/finance/goals/${id}`);
    fetchFinance();
  };

  const handleDebtPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showUpdateDebt) return;
    await api.post(`/finance/debts/${showUpdateDebt.id}/history`, { balance: parseFloat(updateAmount), note: updateNote });
    setShowUpdateDebt(null); setUpdateAmount(''); setUpdateNote('');
    fetchFinance();
  };

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/finance/debts', { ...newDebt, original_amount: parseFloat(newDebt.original_amount), current_balance: parseFloat(newDebt.current_balance) });
    setShowAddDebt(false);
    setNewDebt({ title: '', debt_type: 'Credit Card', original_amount: '', current_balance: '' });
    fetchFinance();
  };

  const handleDeleteDebt = async (id: number) => {
    if (!confirm('Delete this debt?')) return;
    await api.delete(`/finance/debts/${id}`);
    fetchFinance();
  };

  const handleAddUpcoming = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/finance/upcoming', { title: newUpcoming.title, amount: parseFloat(newUpcoming.amount), expected_date: newUpcoming.expected_date });
    setShowAddUpcoming(false);
    setNewUpcoming({ title: '', amount: '', expected_date: '' });
    fetchFinance();
  };

  const handleDeleteUpcoming = async (id: number) => {
    await api.delete(`/finance/upcoming/${id}`);
    fetchFinance();
  };

  // Derived — Money
  const chartData = categories.filter(c => c.type === 'expense').map(c => {
    const spent = transactions.filter(t => t.category_name === c.name).reduce((s, t) => s + parseFloat(String(t.amount)), 0);
    return { name: c.name, spent, budget: c.budget_limit || 0 };
  }).filter(d => d.spent > 0 || d.budget > 0);

  // Derived — Finance
  const totalSavings = goals.reduce((s, g) => s + parseFloat(String(g.current_amount)), 0);
  const totalDebt = debts.reduce((s, d) => s + parseFloat(String(d.current_balance)), 0);
  const totalUpcoming = upcoming.reduce((s, u) => s + parseFloat(String(u.amount)), 0);
  const netPosition = totalSavings - totalDebt;
  const adjustedNet = netPosition + totalUpcoming;

  const getProjectedDate = (goal: FinancialGoal) => {
    const remaining = parseFloat(String(goal.target_amount)) - parseFloat(String(goal.current_amount));
    if (remaining <= 0 || projection.avg_monthly_net <= 0) return null;
    return addMonths(new Date(), Math.ceil(remaining / projection.avg_monthly_net));
  };

  const buildChartData = (goal: FinancialGoal, history: HistoryEntry[]) => {
    const data: any[] = history.map(h => ({ date: format(new Date(h.recorded_at), 'MMM d'), amount: parseFloat(String(h.amount)) }));
    if (projection.avg_monthly_net > 0 && data.length > 0) {
      const target = parseFloat(String(goal.target_amount));
      let current = parseFloat(String(goal.current_amount));
      let date = new Date();
      while (current < target && data.length < 30) {
        current = Math.min(current + projection.avg_monthly_net, target);
        date = addMonths(date, 1);
        data.push({ date: format(date, 'MMM yy'), amount: parseFloat(current.toFixed(2)), projected: true });
      }
    }
    return data;
  };

  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>Money</PageTitle>
          <PageSub>Transactions, savings goals, and debt</PageSub>
        </div>
        {mainTab === 'transactions' && (
          <Controls>
            <MonthSelect value={month} onChange={e => setMonth(+e.target.value)}>
              {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </MonthSelect>
            <MonthSelect value={year} onChange={e => setYear(+e.target.value)}>
              {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </MonthSelect>
          </Controls>
        )}
      </PageHeader>

      <MainTabRow>
        <MainTab active={mainTab === 'transactions'} onClick={() => setMainTab('transactions')}>Transactions</MainTab>
        <MainTab active={mainTab === 'savings'} onClick={() => setMainTab('savings')}>Savings & Debt</MainTab>
      </MainTabRow>

      {/* ── TRANSACTIONS TAB ── */}
      {mainTab === 'transactions' && (
        <>
          <SummaryRow>
            <SummaryCard accent="#FBBF24">
              <SLabel>Income</SLabel>
              <SValue style={{ color: '#FBBF24' }}>${summary.income.toFixed(2)}</SValue>
            </SummaryCard>
            <SummaryCard accent="#F07050">
              <SLabel>Expenses</SLabel>
              <SValue style={{ color: '#F07050' }}>${summary.expense.toFixed(2)}</SValue>
            </SummaryCard>
            <SummaryCard accent={summary.net >= 0 ? '#FBBF24' : '#F07050'}>
              <SLabel>Net</SLabel>
              <SValue style={{ color: summary.net >= 0 ? '#FBBF24' : '#F07050' }}>
                {summary.net >= 0 ? '+' : ''}${summary.net.toFixed(2)}
              </SValue>
            </SummaryCard>
          </SummaryRow>

          {chartData.length > 0 && (
            <ChartSection>
              <SectionLabel>Spending by Category</SectionLabel>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                  <XAxis dataKey="name" tick={{ fill: '#8C7050', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8C7050', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#261A0C', border: '1px solid #3E2A14', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#F5ECD8' }} itemStyle={{ color: '#C4A870' }} />
                  <Bar dataKey="spent" fill="#FBBF24" radius={[4,4,0,0]} name="Spent" />
                  <Bar dataKey="budget" fill="#3E2A14" radius={[4,4,0,0]} name="Budget" />
                </BarChart>
              </ResponsiveContainer>
            </ChartSection>
          )}

          <SubTabRow>
            <SubTab active={subTab === 'transactions'} onClick={() => setSubTab('transactions')}>Transactions</SubTab>
            <SubTab active={subTab === 'categories'} onClick={() => setSubTab('categories')}>Categories</SubTab>
            <AddBtn onClick={() => subTab === 'transactions' ? setShowTxForm(true) : setShowCatForm(true)}>
              + Add {subTab === 'transactions' ? 'Transaction' : 'Category'}
            </AddBtn>
          </SubTabRow>

          {subTab === 'transactions' && (
            <TxList>
              {transactions.length === 0 && <Empty>No transactions this month.</Empty>}
              {transactions.map(t => (
                <TxRow key={t.id}>
                  <TxLeft>
                    <TxDot color={t.category_color || '#FBBF24'} />
                    <TxInfo>
                      <TxDesc>{t.description || t.category_name || 'Transaction'}</TxDesc>
                      <TxMeta>{t.category_name && `${t.category_name} · `}{format(new Date(t.date), 'MMM d')}</TxMeta>
                    </TxInfo>
                  </TxLeft>
                  <TxRight>
                    <TxAmount type={t.type}>{t.type === 'income' ? '+' : '-'}${parseFloat(String(t.amount)).toFixed(2)}</TxAmount>
                    <DeleteBtn onClick={() => handleDeleteTx(t.id)}>×</DeleteBtn>
                  </TxRight>
                </TxRow>
              ))}
            </TxList>
          )}

          {subTab === 'categories' && (
            <CatGrid>
              {categories.length === 0 && <Empty>No categories yet.</Empty>}
              {categories.map(c => {
                const spent = transactions.filter(t => t.category_name === c.name).reduce((s, t) => s + parseFloat(String(t.amount)), 0);
                const pct = c.budget_limit ? Math.min((spent / c.budget_limit) * 100, 100) : 0;
                return (
                  <CatCard key={c.id}>
                    <CatTop>
                      <CatDot color={c.color} />
                      <CatName>{c.name}</CatName>
                      <CatType type={c.type}>{c.type}</CatType>
                      <DeleteBtn onClick={() => handleDeleteCat(c.id)}>×</DeleteBtn>
                    </CatTop>
                    {c.type === 'expense' && c.budget_limit && (
                      <>
                        <BudgetInfo>
                          <span>${spent.toFixed(0)} / ${c.budget_limit}</span>
                          <span style={{ color: pct > 90 ? '#F07050' : '#8C7050' }}>{Math.round(pct)}%</span>
                        </BudgetInfo>
                        <MiniBar><MiniFill style={{ width: `${pct}%`, background: pct > 90 ? '#F07050' : c.color }} /></MiniBar>
                      </>
                    )}
                  </CatCard>
                );
              })}
            </CatGrid>
          )}
        </>
      )}

      {/* ── SAVINGS & DEBT TAB ── */}
      {mainTab === 'savings' && (
        <>
          {(goals.length > 0 || debts.length > 0) && (
            <NetBanner positive={adjustedNet >= 0}>
              <NetBlock>
                <NetLabel>Total Savings</NetLabel>
                <NetValue>${totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</NetValue>
              </NetBlock>
              <NetOp>−</NetOp>
              <NetBlock>
                <NetLabel>Total Debt</NetLabel>
                <NetValue debt>${totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</NetValue>
              </NetBlock>
              {totalUpcoming > 0 && (
                <>
                  <NetOp>+</NetOp>
                  <NetBlock>
                    <NetLabel>Upcoming Cash</NetLabel>
                    <NetValue upcoming>${totalUpcoming.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</NetValue>
                  </NetBlock>
                </>
              )}
              <NetOp>=</NetOp>
              <NetBlock>
                <NetLabel>{totalUpcoming > 0 ? 'Adjusted Net' : 'Net Position'}</NetLabel>
                <NetValue net positive={adjustedNet >= 0}>
                  {adjustedNet >= 0 ? '+' : ''}${adjustedNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </NetValue>
              </NetBlock>
            </NetBanner>
          )}

          {/* Savings Goals */}
          <SectionHeader>
            <SectionTitle>Savings Goals</SectionTitle>
            <AddBtn onClick={() => setShowAddGoal(true)}>+ New Goal</AddBtn>
          </SectionHeader>

          <GoalList>
            {goals.length === 0 && <Empty>No savings goals yet.</Empty>}
            {goals.map(goal => {
              const current = parseFloat(String(goal.current_amount));
              const target = parseFloat(String(goal.target_amount));
              const pct = Math.min((current / target) * 100, 100);
              const remaining = target - current;
              const projectedDate = getProjectedDate(goal);
              const history = histories[goal.id] || [];
              const chartData = buildChartData(goal, history);

              return (
                <GoalCard key={goal.id}>
                  <GoalTop>
                    <GoalTitleRow>
                      <GoalName>{goal.title}</GoalName>
                      <GoalActions>
                        <SmallBtn onClick={() => { setShowUpdateGoal(goal); setUpdateAmount(String(current)); }}>Update Balance</SmallBtn>
                        <SmallBtn danger onClick={() => handleDeleteGoal(goal.id)}>✕</SmallBtn>
                      </GoalActions>
                    </GoalTitleRow>
                    {goal.description && <GoalDesc>{goal.description}</GoalDesc>}
                  </GoalTop>

                  <AmountRow>
                    <AmountBlock>
                      <AmountLabel>Current</AmountLabel>
                      <AmountValue>${current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</AmountValue>
                    </AmountBlock>
                    <AmountDivider />
                    <AmountBlock>
                      <AmountLabel>Target</AmountLabel>
                      <AmountValue muted>${target.toLocaleString()}</AmountValue>
                    </AmountBlock>
                    <AmountDivider />
                    <AmountBlock>
                      <AmountLabel>Remaining</AmountLabel>
                      <AmountValue warn>${remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</AmountValue>
                    </AmountBlock>
                    {projectedDate && (
                      <>
                        <AmountDivider />
                        <AmountBlock>
                          <AmountLabel>Projected</AmountLabel>
                          <AmountValue accent>{format(projectedDate, 'MMM yyyy')}</AmountValue>
                        </AmountBlock>
                      </>
                    )}
                  </AmountRow>

                  <ProgressSection>
                    <ProgressBar>
                      <ProgressFill style={{ width: `${pct}%` }} />
                      {pct > 5 && <ProgressLabel>{pct.toFixed(1)}%</ProgressLabel>}
                    </ProgressBar>
                  </ProgressSection>

                  {chartData.length > 1 && (
                    <ChartWrap>
                      <ChartTitle>Balance History {projection.avg_monthly_net > 0 && history.length > 0 ? '+ Projection' : ''}</ChartTitle>
                      <ResponsiveContainer width="100%" height={150}>
                        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                          <XAxis dataKey="date" tick={{ fill: '#8C7050', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#8C7050', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                          <Tooltip contentStyle={{ background: '#261A0C', border: '1px solid #3E2A14', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#F5ECD8' }} formatter={(v: any) => [`$${parseFloat(v).toLocaleString()}`, 'Balance']} />
                          <ReferenceLine y={target} stroke="#FBBF2440" strokeDasharray="4 4" label={{ value: 'Goal', fill: '#FBBF24', fontSize: 10 }} />
                          <Line type="monotone" dataKey="amount" stroke="#FBBF24" strokeWidth={2}
                            dot={(props: any) => props.payload.projected
                              ? <circle key={props.key} cx={props.cx} cy={props.cy} r={2} fill="#E8A84060" stroke="none" />
                              : <circle key={props.key} cx={props.cx} cy={props.cy} r={3} fill="#FBBF24" stroke="none" />
                            }
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartWrap>
                  )}
                  {history.length === 0 && <NoHistory>Update your balance to start tracking progress over time.</NoHistory>}
                </GoalCard>
              );
            })}
          </GoalList>

          {/* Upcoming Cash */}
          <SectionHeader>
            <SectionTitle>Upcoming Cash</SectionTitle>
            <AddBtn onClick={() => setShowAddUpcoming(true)}>+ Add</AddBtn>
          </SectionHeader>

          {upcoming.length === 0 && <Empty style={{ paddingTop: 16, paddingBottom: 16 }}>No upcoming cash logged.</Empty>}
          {upcoming.length > 0 && (
            <UpcomingList>
              {upcoming.map(u => (
                <UpcomingRow key={u.id}>
                  <UpcomingInfo>
                    <UpcomingTitle>{u.title}</UpcomingTitle>
                    <UpcomingDate>{format(new Date(u.expected_date), 'MMM d, yyyy')}</UpcomingDate>
                  </UpcomingInfo>
                  <UpcomingAmount>+${parseFloat(String(u.amount)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</UpcomingAmount>
                  <SmallBtn danger onClick={() => handleDeleteUpcoming(u.id)}>✕</SmallBtn>
                </UpcomingRow>
              ))}
              <UpcomingTotal>
                <span>Total Expected</span>
                <span>${totalUpcoming.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </UpcomingTotal>
            </UpcomingList>
          )}

          {/* Debt Payoff */}
          <SectionHeader>
            <SectionTitle>Debt Payoff</SectionTitle>
            <AddBtn onClick={() => setShowAddDebt(true)}>+ Add Debt</AddBtn>
          </SectionHeader>

          <GoalList>
            {debts.length === 0 && <Empty>No debts tracked yet.</Empty>}
            {debts.map(debt => {
              const original = parseFloat(String(debt.original_amount));
              const balance = parseFloat(String(debt.current_balance));
              const paidOff = Math.min(((original - balance) / original) * 100, 100);
              const dHistory = debtHistories[debt.id] || [];
              const debtChartData = dHistory.map(h => ({ date: format(new Date(h.recorded_at), 'MMM d'), balance: parseFloat(String(h.balance)) }));

              return (
                <DebtCard key={debt.id}>
                  <GoalTop>
                    <GoalTitleRow>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <GoalName>{debt.title}</GoalName>
                        <DebtTypeBadge>{debt.debt_type}</DebtTypeBadge>
                      </div>
                      <GoalActions>
                        <SmallBtn onClick={() => { setShowUpdateDebt(debt); setUpdateAmount(String(balance)); }}>Log Payment</SmallBtn>
                        <SmallBtn danger onClick={() => handleDeleteDebt(debt.id)}>✕</SmallBtn>
                      </GoalActions>
                    </GoalTitleRow>
                  </GoalTop>

                  <AmountRow>
                    <AmountBlock>
                      <AmountLabel>Current Balance</AmountLabel>
                      <AmountValue warn>${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</AmountValue>
                    </AmountBlock>
                    <AmountDivider />
                    <AmountBlock>
                      <AmountLabel>Original</AmountLabel>
                      <AmountValue muted>${original.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</AmountValue>
                    </AmountBlock>
                  </AmountRow>

                  <ProgressSection>
                    <ProgressBar>
                      <DebtProgressFill style={{ width: `${paidOff}%` }} />
                      {paidOff > 5 && <ProgressLabel>{paidOff.toFixed(1)}% paid off</ProgressLabel>}
                    </ProgressBar>
                  </ProgressSection>

                  {debtChartData.length > 1 && (
                    <ChartWrap>
                      <ChartTitle>Balance History</ChartTitle>
                      <ResponsiveContainer width="100%" height={130}>
                        <LineChart data={debtChartData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                          <XAxis dataKey="date" tick={{ fill: '#8C7050', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#8C7050', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                          <Tooltip contentStyle={{ background: '#261A0C', border: '1px solid #3E2A14', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#F5ECD8' }} formatter={(v: any) => [`$${parseFloat(v).toLocaleString()}`, 'Balance']} />
                          <Line type="monotone" dataKey="balance" stroke="#F07050" strokeWidth={2} dot={{ r: 3, fill: '#F07050', stroke: 'none' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartWrap>
                  )}
                  {dHistory.length === 0 && <NoHistory>Log a payment to start tracking payoff progress.</NoHistory>}
                </DebtCard>
              );
            })}
          </GoalList>
        </>
      )}

      {/* ── MODALS ── */}
      {showTxForm && (
        <Modal onClick={() => setShowTxForm(false)}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalTitle>Add Transaction</ModalTitle>
            <Form onSubmit={handleAddTx}>
              <TypeToggle>
                <TypeBtn active={txForm.type === 'expense'} onClick={() => setTxForm(f => ({ ...f, type: 'expense' }))} type="button">Expense</TypeBtn>
                <TypeBtn active={txForm.type === 'income'} onClick={() => setTxForm(f => ({ ...f, type: 'income' }))} type="button" income>Income</TypeBtn>
              </TypeToggle>
              <Label>Amount</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} required />
              <Label>Description</Label>
              <Input placeholder="What was this for?" value={txForm.description} onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))} />
              <Label>Category</Label>
              <Select value={txForm.category_id} onChange={e => setTxForm(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">No category</option>
                {categories.filter(c => c.type === txForm.type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Label>Date</Label>
              <Input type="date" value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} />
              <ModalActions>
                <CancelBtn type="button" onClick={() => setShowTxForm(false)}>Cancel</CancelBtn>
                <SubmitBtn type="submit">Add</SubmitBtn>
              </ModalActions>
            </Form>
          </ModalBox>
        </Modal>
      )}

      {showCatForm && (
        <Modal onClick={() => setShowCatForm(false)}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalTitle>Add Category</ModalTitle>
            <Form onSubmit={handleAddCat}>
              <Label>Name</Label>
              <Input placeholder="e.g. Groceries, Salary" value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} required />
              <TypeToggle>
                <TypeBtn active={catForm.type === 'expense'} onClick={() => setCatForm(f => ({ ...f, type: 'expense' }))} type="button">Expense</TypeBtn>
                <TypeBtn active={catForm.type === 'income'} onClick={() => setCatForm(f => ({ ...f, type: 'income' }))} type="button" income>Income</TypeBtn>
              </TypeToggle>
              {catForm.type === 'expense' && (
                <>
                  <Label>Monthly Budget (optional)</Label>
                  <Input type="number" step="0.01" placeholder="e.g. 500" value={catForm.budget_limit} onChange={e => setCatForm(f => ({ ...f, budget_limit: e.target.value }))} />
                </>
              )}
              <Label>Color</Label>
              <ColorRow>
                {COLORS.map(c => <ColorSwatch key={c} color={c} selected={catForm.color === c} onClick={() => setCatForm(f => ({ ...f, color: c }))} type="button" />)}
              </ColorRow>
              <ModalActions>
                <CancelBtn type="button" onClick={() => setShowCatForm(false)}>Cancel</CancelBtn>
                <SubmitBtn type="submit">Create</SubmitBtn>
              </ModalActions>
            </Form>
          </ModalBox>
        </Modal>
      )}

      {showUpdateGoal && (
        <Modal onClick={() => setShowUpdateGoal(null)}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalTitle>Update Balance</ModalTitle>
            <ModalSub>{showUpdateGoal.title}</ModalSub>
            <Form onSubmit={handleUpdateGoal}>
              <Label>Current Balance ($)</Label>
              <Input type="number" step="0.01" placeholder="e.g. 3200.00" value={updateAmount} onChange={e => setUpdateAmount(e.target.value)} required autoFocus />
              <Label>Note (optional)</Label>
              <Input placeholder="e.g. Added paycheck deposit" value={updateNote} onChange={e => setUpdateNote(e.target.value)} />
              <ModalActions>
                <CancelBtn type="button" onClick={() => setShowUpdateGoal(null)}>Cancel</CancelBtn>
                <SubmitBtn type="submit">Save</SubmitBtn>
              </ModalActions>
            </Form>
          </ModalBox>
        </Modal>
      )}

      {showAddGoal && (
        <Modal onClick={() => setShowAddGoal(false)}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalTitle>New Savings Goal</ModalTitle>
            <Form onSubmit={handleAddGoal}>
              <Label>Title</Label>
              <Input placeholder="e.g. Emergency Fund" value={newGoal.title} onChange={e => setNewGoal(f => ({ ...f, title: e.target.value }))} required />
              <Label>Description (optional)</Label>
              <Textarea placeholder="What is this goal for?" value={newGoal.description} onChange={e => setNewGoal(f => ({ ...f, description: e.target.value }))} rows={2} />
              <TwoCol>
                <div>
                  <Label>Target ($)</Label>
                  <Input type="number" step="0.01" placeholder="25000" value={newGoal.target_amount} onChange={e => setNewGoal(f => ({ ...f, target_amount: e.target.value }))} required />
                </div>
                <div>
                  <Label>Current ($)</Label>
                  <Input type="number" step="0.01" placeholder="0" value={newGoal.current_amount} onChange={e => setNewGoal(f => ({ ...f, current_amount: e.target.value }))} />
                </div>
              </TwoCol>
              <ModalActions>
                <CancelBtn type="button" onClick={() => setShowAddGoal(false)}>Cancel</CancelBtn>
                <SubmitBtn type="submit">Create Goal</SubmitBtn>
              </ModalActions>
            </Form>
          </ModalBox>
        </Modal>
      )}

      {showUpdateDebt && (
        <Modal onClick={() => setShowUpdateDebt(null)}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalTitle>Log Payment</ModalTitle>
            <ModalSub>{showUpdateDebt.title}</ModalSub>
            <Form onSubmit={handleDebtPayment}>
              <Label>New Balance After Payment ($)</Label>
              <Input type="number" step="0.01" placeholder="e.g. 4800.00" value={updateAmount} onChange={e => setUpdateAmount(e.target.value)} required autoFocus />
              <Label>Note (optional)</Label>
              <Input placeholder="e.g. Monthly payment" value={updateNote} onChange={e => setUpdateNote(e.target.value)} />
              <ModalActions>
                <CancelBtn type="button" onClick={() => setShowUpdateDebt(null)}>Cancel</CancelBtn>
                <SubmitBtn type="submit">Save</SubmitBtn>
              </ModalActions>
            </Form>
          </ModalBox>
        </Modal>
      )}

      {showAddDebt && (
        <Modal onClick={() => setShowAddDebt(false)}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalTitle>Add Debt</ModalTitle>
            <Form onSubmit={handleAddDebt}>
              <Label>Name</Label>
              <Input placeholder="e.g. Chase Sapphire Card" value={newDebt.title} onChange={e => setNewDebt(f => ({ ...f, title: e.target.value }))} required autoFocus />
              <Label>Type</Label>
              <Select value={newDebt.debt_type} onChange={e => setNewDebt(f => ({ ...f, debt_type: e.target.value }))}>
                {DEBT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
              <TwoCol>
                <div>
                  <Label>Original Amount ($)</Label>
                  <Input type="number" step="0.01" placeholder="10000" value={newDebt.original_amount} onChange={e => setNewDebt(f => ({ ...f, original_amount: e.target.value }))} required />
                </div>
                <div>
                  <Label>Current Balance ($)</Label>
                  <Input type="number" step="0.01" placeholder="8500" value={newDebt.current_balance} onChange={e => setNewDebt(f => ({ ...f, current_balance: e.target.value }))} required />
                </div>
              </TwoCol>
              <ModalActions>
                <CancelBtn type="button" onClick={() => setShowAddDebt(false)}>Cancel</CancelBtn>
                <SubmitBtn type="submit">Add Debt</SubmitBtn>
              </ModalActions>
            </Form>
          </ModalBox>
        </Modal>
      )}

      {showAddUpcoming && (
        <Modal onClick={() => setShowAddUpcoming(false)}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalTitle>Add Upcoming Cash</ModalTitle>
            <Form onSubmit={handleAddUpcoming}>
              <Label>Description</Label>
              <Input placeholder="e.g. July paycheck, Tax refund" value={newUpcoming.title} onChange={e => setNewUpcoming(f => ({ ...f, title: e.target.value }))} required autoFocus />
              <TwoCol>
                <div>
                  <Label>Amount ($)</Label>
                  <Input type="number" step="0.01" placeholder="2500" value={newUpcoming.amount} onChange={e => setNewUpcoming(f => ({ ...f, amount: e.target.value }))} required />
                </div>
                <div>
                  <Label>Expected Date</Label>
                  <Input type="date" value={newUpcoming.expected_date} onChange={e => setNewUpcoming(f => ({ ...f, expected_date: e.target.value }))} required />
                </div>
              </TwoCol>
              <ModalActions>
                <CancelBtn type="button" onClick={() => setShowAddUpcoming(false)}>Cancel</CancelBtn>
                <SubmitBtn type="submit">Add</SubmitBtn>
              </ModalActions>
            </Form>
          </ModalBox>
        </Modal>
      )}
    </Page>
  );
}

// ── Styles ──
const Page = styled.div`padding: 40px 48px; max-width: 1000px; @media (max-width: 768px) { padding: 24px 16px; }`;
const PageHeader = styled.div`display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;`;
const PageTitle = styled.h1`font-family: 'DM Serif Display', serif; font-size: 1.8rem; font-weight: 400; color: #F5ECD8;`;
const PageSub = styled.p`color: #8C7050; font-size: 0.85rem; margin-top: 2px;`;
const Controls = styled.div`display: flex; gap: 8px;`;
const MonthSelect = styled.select`background: #261A0C; border: 1px solid #3E2A14; border-radius: 8px; padding: 8px 12px; color: #F5ECD8; font-size: 0.85rem; outline: none; &:focus { border-color: #FBBF24; }`;
const AddBtn = styled.button`background: #FBBF24; color: #1C1208; border: none; border-radius: 8px; padding: 8px 16px; font-weight: 600; font-size: 0.82rem; white-space: nowrap; &:hover { opacity: 0.9; }`;

const MainTabRow = styled.div`display: flex; gap: 0; margin-bottom: 28px; border-bottom: 1px solid #3E2A14;`;
const MainTab = styled.button<{ active: boolean }>`
  padding: 10px 20px; background: none; border: none; border-bottom: 2px solid ${p => p.active ? '#FBBF24' : 'transparent'};
  color: ${p => p.active ? '#FBBF24' : '#8C7050'}; font-size: 0.9rem; font-weight: ${p => p.active ? 600 : 400};
  margin-bottom: -1px; transition: all 0.15s;
  &:hover { color: #F5ECD8; }
`;

const SummaryRow = styled.div`display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-bottom: 24px; @media (max-width: 640px) { grid-template-columns: 1fr; }`;
const SummaryCard = styled.div<{ accent: string }>`background: #261A0C; border: 1px solid #3E2A14; border-radius: 12px; padding: 18px; border-top: 2px solid ${p => p.accent};`;
const SLabel = styled.p`font-size: 0.75rem; color: #8C7050; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;`;
const SValue = styled.div`font-family: 'DM Serif Display', serif; font-size: 1.6rem;`;
const ChartSection = styled.div`background: #261A0C; border: 1px solid #3E2A14; border-radius: 12px; padding: 20px; margin-bottom: 24px;`;
const SectionLabel = styled.h2`font-size: 0.82rem; font-weight: 600; color: #8C7050; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;`;

const SubTabRow = styled.div`display: flex; align-items: center; gap: 8px; margin-bottom: 16px;`;
const SubTab = styled.button<{ active: boolean }>`padding: 6px 14px; border-radius: 20px; border: 1px solid ${p => p.active ? '#FBBF24' : '#3E2A14'}; background: ${p => p.active ? 'rgba(251,191,36,0.12)' : 'transparent'}; color: ${p => p.active ? '#FBBF24' : '#8C7050'}; font-size: 0.82rem; &:hover { border-color: #FBBF24; color: #FBBF24; }`;

const TxList = styled.div`display: flex; flex-direction: column; gap: 2px;`;
const TxRow = styled.div`display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #261A0C; border: 1px solid #3E2A14; border-radius: 10px; margin-bottom: 6px;`;
const TxLeft = styled.div`display: flex; align-items: center; gap: 12px;`;
const TxDot = styled.div<{ color: string }>`width: 8px; height: 8px; border-radius: 50%; background: ${p => p.color}; flex-shrink: 0;`;
const TxInfo = styled.div``;
const TxDesc = styled.p`font-size: 0.88rem; color: #F5ECD8;`;
const TxMeta = styled.p`font-size: 0.75rem; color: #6B5038; margin-top: 1px;`;
const TxRight = styled.div`display: flex; align-items: center; gap: 12px;`;
const TxAmount = styled.span<{ type: string }>`font-size: 0.9rem; font-weight: 600; color: ${p => p.type === 'income' ? '#FBBF24' : '#F07050'};`;
const DeleteBtn = styled.button`background: none; border: none; color: #6B5038; font-size: 1rem; padding: 2px 4px; &:hover { color: #F07050; }`;

const CatGrid = styled.div`display: grid; grid-template-columns: repeat(auto-fill, minmax(220px,1fr)); gap: 12px;`;
const CatCard = styled.div`background: #261A0C; border: 1px solid #3E2A14; border-radius: 10px; padding: 14px;`;
const CatTop = styled.div`display: flex; align-items: center; gap: 8px; margin-bottom: 10px;`;
const CatDot = styled.div<{ color: string }>`width: 10px; height: 10px; border-radius: 50%; background: ${p => p.color};`;
const CatName = styled.span`font-size: 0.88rem; color: #F5ECD8; flex: 1;`;
const CatType = styled.span<{ type: string }>`font-size: 0.7rem; color: ${p => p.type === 'income' ? '#FBBF24' : '#F07050'}; background: ${p => p.type === 'income' ? 'rgba(251,191,36,0.1)' : 'rgba(240,112,80,0.1)'}; padding: 2px 6px; border-radius: 10px;`;
const BudgetInfo = styled.div`display: flex; justify-content: space-between; font-size: 0.75rem; color: #8C7050; margin-bottom: 6px;`;
const MiniBar = styled.div`height: 3px; background: #3E2A14; border-radius: 2px; overflow: hidden;`;
const MiniFill = styled.div`height: 100%; border-radius: 2px; transition: width 0.3s;`;

// Net position
const NetBanner = styled.div<{ positive?: boolean }>`
  display: flex; align-items: center; gap: 20px;
  background: #261A0C; border: 1px solid ${p => p.positive ? '#FBBF2440' : '#F0705040'};
  border-radius: 12px; padding: 18px 24px; margin-bottom: 32px; flex-wrap: wrap;
`;
const NetBlock = styled.div`display: flex; flex-direction: column; align-items: center;`;
const NetLabel = styled.p`font-size: 0.72rem; color: #8C7050; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;`;
const NetValue = styled.p<{ debt?: boolean; upcoming?: boolean; net?: boolean; positive?: boolean; muted?: boolean; warn?: boolean; accent?: boolean }>`
  font-family: 'DM Serif Display', serif; font-size: 1.5rem;
  color: ${p => p.net ? (p.positive ? '#FBBF24' : '#F07050') : p.debt ? '#F07050' : p.upcoming ? '#6BCB8B' : '#F5ECD8'};
`;
const NetOp = styled.span`font-size: 1.4rem; color: #6B5038; font-family: 'DM Serif Display', serif; padding-bottom: 2px;`;

const SectionHeader = styled.div`display: flex; justify-content: space-between; align-items: center; margin: 28px 0 16px;`;
const SectionTitle = styled.h2`font-family: 'DM Serif Display', serif; font-size: 1.3rem; font-weight: 400; color: #F5ECD8;`;

const GoalList = styled.div`display: flex; flex-direction: column; gap: 20px;`;
const GoalCard = styled.div`background: #261A0C; border: 1px solid #3E2A14; border-radius: 16px; padding: 24px; border-left: 3px solid #FBBF24;`;
const DebtCard = styled.div`background: #261A0C; border: 1px solid #3E2A14; border-radius: 16px; padding: 24px; border-left: 3px solid #F07050;`;
const GoalTop = styled.div`margin-bottom: 16px;`;
const GoalTitleRow = styled.div`display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;`;
const GoalName = styled.h2`font-family: 'DM Serif Display', serif; font-size: 1.2rem; font-weight: 400; color: #F5ECD8;`;
const GoalDesc = styled.p`font-size: 0.83rem; color: #8C7050; margin-top: 6px; line-height: 1.6;`;
const GoalActions = styled.div`display: flex; gap: 8px; flex-shrink: 0;`;
const DebtTypeBadge = styled.span`font-size: 0.72rem; background: rgba(240,112,80,0.12); color: #F07050; border: 1px solid #F0705040; border-radius: 4px; padding: 2px 8px; white-space: nowrap;`;

const SmallBtn = styled.button<{ danger?: boolean }>`padding: 5px 12px; border-radius: 6px; font-size: 0.75rem; border: 1px solid ${p => p.danger ? '#F07050' : '#3E2A14'}; background: transparent; color: ${p => p.danger ? '#F07050' : '#8C7050'}; &:hover { opacity: 0.8; }`;

const AmountRow = styled.div`display: flex; align-items: center; gap: 16px; margin-bottom: 16px; flex-wrap: wrap;`;
const AmountBlock = styled.div``;
const AmountLabel = styled.p`font-size: 0.72rem; color: #8C7050; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;`;
const AmountValue = styled.p<{ muted?: boolean; warn?: boolean; accent?: boolean }>`
  font-family: 'DM Serif Display', serif; font-size: 1.3rem;
  color: ${p => p.accent ? '#FBBF24' : p.warn ? '#E8A840' : p.muted ? '#6B5038' : '#F5ECD8'};
`;
const AmountDivider = styled.div`width: 1px; height: 28px; background: #3E2A14; align-self: center;`;

const ProgressSection = styled.div`margin-bottom: 16px;`;
const ProgressBar = styled.div`height: 10px; background: #3E2A14; border-radius: 6px; overflow: hidden; position: relative;`;
const ProgressFill = styled.div`height: 100%; background: linear-gradient(90deg, #FBBF24, #E8A840); border-radius: 6px; transition: width 0.5s ease; position: relative;`;
const DebtProgressFill = styled.div`height: 100%; background: linear-gradient(90deg, #F07050, #E85030); border-radius: 6px; transition: width 0.5s ease; position: relative;`;
const ProgressLabel = styled.span`position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 0.65rem; font-weight: 700; color: #1C1208;`;

const ChartWrap = styled.div`margin-top: 8px;`;
const ChartTitle = styled.p`font-size: 0.75rem; color: #6B5038; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;`;
const NoHistory = styled.p`font-size: 0.82rem; color: #6B5038; font-style: italic; text-align: center; padding: 12px 0;`;

const UpcomingList = styled.div`background: #261A0C; border: 1px solid #3E2A14; border-radius: 12px; overflow: hidden; margin-bottom: 8px;`;
const UpcomingRow = styled.div`display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-bottom: 1px solid #3E2A14; &:last-child { border-bottom: none; }`;
const UpcomingInfo = styled.div`flex: 1;`;
const UpcomingTitle = styled.p`font-size: 0.9rem; color: #F5ECD8; font-weight: 500;`;
const UpcomingDate = styled.p`font-size: 0.75rem; color: #8C7050; margin-top: 2px;`;
const UpcomingAmount = styled.span`font-family: 'DM Serif Display', serif; font-size: 1.2rem; color: #6BCB8B; white-space: nowrap;`;
const UpcomingTotal = styled.div`display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: rgba(107,203,139,0.06); font-size: 0.8rem; color: #6BCB8B; font-weight: 600; letter-spacing: 0.03em;`;

const Empty = styled.p`color: #6B5038; padding: 32px; text-align: center;`;
const Modal = styled.div`position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px;`;
const ModalBox = styled.div`background: #261A0C; border: 1px solid #3E2A14; border-radius: 16px; padding: 32px; width: 100%; max-width: 440px; max-height: 90vh; overflow-y: auto;`;
const ModalTitle = styled.h2`font-family: 'DM Serif Display', serif; font-size: 1.3rem; font-weight: 400; color: #F5ECD8; margin-bottom: 6px;`;
const ModalSub = styled.p`font-size: 0.83rem; color: #8C7050; margin-bottom: 20px;`;
const Form = styled.form`display: flex; flex-direction: column; gap: 12px;`;
const Label = styled.label`font-size: 0.8rem; color: #C4A870; display: block; margin-bottom: 2px;`;
const Input = styled.input`width: 100%; background: #1C1208; border: 1px solid #3E2A14; border-radius: 8px; padding: 10px 14px; color: #F5ECD8; outline: none; &:focus { border-color: #FBBF24; } &::placeholder { color: #6B5038; }`;
const Textarea = styled.textarea`width: 100%; background: #1C1208; border: 1px solid #3E2A14; border-radius: 8px; padding: 10px 14px; color: #F5ECD8; outline: none; resize: vertical; &:focus { border-color: #FBBF24; } &::placeholder { color: #6B5038; }`;
const Select = styled.select`width: 100%; background: #1C1208; border: 1px solid #3E2A14; border-radius: 8px; padding: 10px 14px; color: #F5ECD8; outline: none; &:focus { border-color: #FBBF24; }`;
const TwoCol = styled.div`display: flex; gap: 12px; & > div { flex: 1; }`;
const TypeToggle = styled.div`display: flex; gap: 8px;`;
const TypeBtn = styled.button<{ active: boolean; income?: boolean }>`flex: 1; padding: 8px; border-radius: 8px; border: 1px solid ${p => p.active ? (p.income ? '#FBBF24' : '#F07050') : '#3E2A14'}; background: ${p => p.active ? (p.income ? 'rgba(251,191,36,0.1)' : 'rgba(240,112,80,0.1)') : 'transparent'}; color: ${p => p.active ? (p.income ? '#FBBF24' : '#F07050') : '#8C7050'}; font-size: 0.85rem;`;
const ColorRow = styled.div`display: flex; gap: 8px; flex-wrap: wrap;`;
const ColorSwatch = styled.button<{ color: string; selected: boolean }>`width: 24px; height: 24px; border-radius: 50%; background: ${p => p.color}; border: 2px solid ${p => p.selected ? '#F5ECD8' : 'transparent'}; padding: 0;`;
const ModalActions = styled.div`display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px;`;
const CancelBtn = styled.button`background: none; border: 1px solid #3E2A14; border-radius: 8px; color: #8C7050; padding: 9px 18px; font-size: 0.88rem; &:hover { border-color: #8C7050; }`;
const SubmitBtn = styled.button`background: #FBBF24; color: #1C1208; border: none; border-radius: 8px; padding: 9px 18px; font-weight: 600; font-size: 0.88rem; &:hover { opacity: 0.9; }`;
