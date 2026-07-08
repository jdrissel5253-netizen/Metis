import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { format, addMonths } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import api from '../api';

interface FinancialGoal {
  id: number;
  title: string;
  description: string;
  target_amount: number;
  current_amount: number;
  created_at: string;
}

interface HistoryEntry {
  id: number;
  amount: number;
  note: string;
  recorded_at: string;
}

interface Projection {
  avg_monthly_net: number;
  months: { year: number; month: number; income: number; expense: number }[];
}

interface Debt {
  id: number;
  title: string;
  debt_type: string;
  original_amount: number;
  current_balance: number;
  interest_rate: number;
  minimum_payment: number;
  created_at: string;
}

interface DebtHistory {
  id: number;
  balance: number;
  note: string;
  recorded_at: string;
}

interface UpcomingCash {
  id: number;
  title: string;
  amount: number;
  expected_date: string;
}

const DEBT_TYPES = ['Credit Card', 'Student Loan', 'Car Loan', 'Personal Loan', 'Medical', 'Other'];

export default function Finance() {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [histories, setHistories] = useState<Record<number, HistoryEntry[]>>({});
  const [projection, setProjection] = useState<Projection>({ avg_monthly_net: 0, months: [] });
  const [debts, setDebts] = useState<Debt[]>([]);
  const [debtHistories, setDebtHistories] = useState<Record<number, DebtHistory[]>>({});
  const [showUpdate, setShowUpdate] = useState<FinancialGoal | null>(null);
  const [showDebtUpdate, setShowDebtUpdate] = useState<Debt | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [updateAmount, setUpdateAmount] = useState('');
  const [updateNote, setUpdateNote] = useState('');
  const [newGoal, setNewGoal] = useState({ title: '', description: '', target_amount: '', current_amount: '' });
  const [newDebt, setNewDebt] = useState({ title: '', debt_type: 'Credit Card', original_amount: '', current_balance: '', interest_rate: '', minimum_payment: '' });
  const [upcoming, setUpcoming] = useState<UpcomingCash[]>([]);
  const [showAddUpcoming, setShowAddUpcoming] = useState(false);
  const [newUpcoming, setNewUpcoming] = useState({ title: '', amount: '', expected_date: '' });

  const fetchAll = async () => {
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

  useEffect(() => { fetchAll(); }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showUpdate) return;
    await api.post(`/finance/goals/${showUpdate.id}/history`, {
      amount: parseFloat(updateAmount),
      note: updateNote,
    });
    setShowUpdate(null);
    setUpdateAmount('');
    setUpdateNote('');
    fetchAll();
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/finance/goals', {
      ...newGoal,
      target_amount: parseFloat(newGoal.target_amount),
      current_amount: parseFloat(newGoal.current_amount) || 0,
    });
    setShowAddGoal(false);
    setNewGoal({ title: '', description: '', target_amount: '', current_amount: '' });
    fetchAll();
  };

  const handleDeleteGoal = async (id: number) => {
    if (!confirm('Delete this financial goal?')) return;
    await api.delete(`/finance/goals/${id}`);
    fetchAll();
  };

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/finance/debts', {
      ...newDebt,
      original_amount: parseFloat(newDebt.original_amount),
      current_balance: parseFloat(newDebt.current_balance),
      interest_rate: parseFloat(newDebt.interest_rate) || 0,
      minimum_payment: parseFloat(newDebt.minimum_payment) || 0,
    });
    setShowAddDebt(false);
    setNewDebt({ title: '', debt_type: 'Credit Card', original_amount: '', current_balance: '', interest_rate: '', minimum_payment: '' });
    fetchAll();
  };

  const handleDebtPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showDebtUpdate) return;
    await api.post(`/finance/debts/${showDebtUpdate.id}/history`, {
      balance: parseFloat(updateAmount),
      note: updateNote,
    });
    setShowDebtUpdate(null);
    setUpdateAmount('');
    setUpdateNote('');
    fetchAll();
  };

  const handleDeleteDebt = async (id: number) => {
    if (!confirm('Delete this debt?')) return;
    await api.delete(`/finance/debts/${id}`);
    fetchAll();
  };

  const handleAddUpcoming = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/finance/upcoming', {
      title: newUpcoming.title,
      amount: parseFloat(newUpcoming.amount),
      expected_date: newUpcoming.expected_date,
    });
    setShowAddUpcoming(false);
    setNewUpcoming({ title: '', amount: '', expected_date: '' });
    fetchAll();
  };

  const handleDeleteUpcoming = async (id: number) => {
    await api.delete(`/finance/upcoming/${id}`);
    fetchAll();
  };

  const getProjectedDate = (goal: FinancialGoal) => {
    const remaining = parseFloat(String(goal.target_amount)) - parseFloat(String(goal.current_amount));
    if (remaining <= 0) return null;
    if (projection.avg_monthly_net <= 0) return null;
    const monthsNeeded = Math.ceil(remaining / projection.avg_monthly_net);
    return addMonths(new Date(), monthsNeeded);
  };

  const buildChartData = (goal: FinancialGoal, history: HistoryEntry[]) => {
    const data = history.map(h => ({
      date: format(new Date(h.recorded_at), 'MMM d'),
      amount: parseFloat(String(h.amount)),
    }));

    // Project forward if we have avg net
    if (projection.avg_monthly_net > 0 && data.length > 0) {
      const last = parseFloat(String(goal.current_amount));
      const target = parseFloat(String(goal.target_amount));
      let current = last;
      let date = new Date();
      while (current < target) {
        current = Math.min(current + projection.avg_monthly_net, target);
        date = addMonths(date, 1);
        data.push({ date: format(date, 'MMM yy'), amount: parseFloat(current.toFixed(2)), projected: true } as any);
        if (data.length > 30) break;
      }
    }

    return data;
  };

  const totalSavings = goals.reduce((s, g) => s + parseFloat(String(g.current_amount)), 0);
  const totalDebt = debts.reduce((s, d) => s + parseFloat(String(d.current_balance)), 0);
  const totalUpcoming = upcoming.reduce((s, u) => s + parseFloat(String(u.amount)), 0);
  const netPosition = totalSavings - totalDebt;
  const adjustedNet = netPosition + totalUpcoming;

  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>Finance</PageTitle>
          <PageSub>Track your savings goals and financial progress</PageSub>
        </div>
        <AddBtn onClick={() => setShowAddGoal(true)}>+ New Goal</AddBtn>
      </PageHeader>

      {projection.avg_monthly_net > 0 && (
        <ProjectionBanner>
          <BannerIcon>↗</BannerIcon>
          <div>
            <BannerTitle>Monthly Net Savings</BannerTitle>
            <BannerSub>Based on your last {projection.months.length} month{projection.months.length !== 1 ? 's' : ''} of transactions</BannerSub>
          </div>
          <BannerAmount positive={projection.avg_monthly_net >= 0}>
            {projection.avg_monthly_net >= 0 ? '+' : ''}${projection.avg_monthly_net.toLocaleString()} / mo
          </BannerAmount>
        </ProjectionBanner>
      )}

      {projection.avg_monthly_net === 0 && (
        <ProjectionBanner dim>
          <BannerIcon>💡</BannerIcon>
          <div>
            <BannerTitle>No transaction data yet</BannerTitle>
            <BannerSub>Log income and expenses on the Money page to see savings projections here</BannerSub>
          </div>
        </ProjectionBanner>
      )}

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

      <GoalList>
        {goals.length === 0 && <Empty>No financial goals yet.</Empty>}
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
                    <SmallBtn onClick={() => { setShowUpdate(goal); setUpdateAmount(String(current)); }}>
                      Update Balance
                    </SmallBtn>
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
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                      <XAxis dataKey="date" tick={{ fill: '#8C7050', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#8C7050', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{ background: '#261A0C', border: '1px solid #3E2A14', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: '#F5ECD8' }}
                        formatter={(v: any) => [`$${parseFloat(v).toLocaleString()}`, 'Balance']}
                      />
                      <ReferenceLine y={target} stroke="#FBBF2440" strokeDasharray="4 4" label={{ value: 'Goal', fill: '#FBBF24', fontSize: 10 }} />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#FBBF24"
                        strokeWidth={2}
                        dot={(props: any) => props.payload.projected
                          ? <circle key={props.key} cx={props.cx} cy={props.cy} r={2} fill="#E8A84060" stroke="none" />
                          : <circle key={props.key} cx={props.cx} cy={props.cy} r={3} fill="#FBBF24" stroke="none" />
                        }
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartWrap>
              )}

              {history.length === 0 && (
                <NoHistory>Update your balance to start tracking progress over time.</NoHistory>
              )}
            </GoalCard>
          );
        })}
      </GoalList>

      <SectionHeader>
        <SectionTitle>Upcoming Cash</SectionTitle>
        <AddBtn onClick={() => setShowAddUpcoming(true)}>+ Add</AddBtn>
      </SectionHeader>

      {upcoming.length === 0 && (
        <Empty style={{ paddingTop: 24, paddingBottom: 24 }}>No upcoming cash logged. Add expected income to factor it into your net position.</Empty>
      )}

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

      <SectionHeader>
        <SectionTitle>Debt Payoff</SectionTitle>
        <AddBtn onClick={() => setShowAddDebt(true)}>+ Add Debt</AddBtn>
      </SectionHeader>

      <GoalList>
        {debts.length === 0 && <Empty>No debts tracked yet. Add one to start tracking your payoff progress.</Empty>}
        {debts.map(debt => {
          const original = parseFloat(String(debt.original_amount));
          const balance = parseFloat(String(debt.current_balance));
          const paidOff = Math.min(((original - balance) / original) * 100, 100);
          const dHistory = debtHistories[debt.id] || [];
          const chartData = dHistory.map(h => ({
            date: format(new Date(h.recorded_at), 'MMM d'),
            balance: parseFloat(String(h.balance)),
          }));

          return (
            <DebtCard key={debt.id}>
              <GoalTop>
                <GoalTitleRow>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <GoalName>{debt.title}</GoalName>
                    <DebtTypeBadge>{debt.debt_type}</DebtTypeBadge>
                  </div>
                  <GoalActions>
                    <SmallBtn onClick={() => { setShowDebtUpdate(debt); setUpdateAmount(String(balance)); }}>
                      Log Payment
                    </SmallBtn>
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

              {chartData.length > 1 && (
                <ChartWrap>
                  <ChartTitle>Balance History</ChartTitle>
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                      <XAxis dataKey="date" tick={{ fill: '#8C7050', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#8C7050', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{ background: '#261A0C', border: '1px solid #3E2A14', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: '#F5ECD8' }}
                        formatter={(v: any) => [`$${parseFloat(v).toLocaleString()}`, 'Balance']}
                      />
                      <Line type="monotone" dataKey="balance" stroke="#F07050" strokeWidth={2} dot={{ r: 3, fill: '#F07050', stroke: 'none' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartWrap>
              )}

              {dHistory.length === 0 && (
                <NoHistory>Log a payment to start tracking your payoff progress over time.</NoHistory>
              )}
            </DebtCard>
          );
        })}
      </GoalList>

      {showDebtUpdate && (
        <Modal onClick={() => setShowDebtUpdate(null)}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalTitle>Log Payment</ModalTitle>
            <ModalGoalName>{showDebtUpdate.title}</ModalGoalName>
            <Form onSubmit={handleDebtPayment}>
              <Label>New Balance After Payment ($)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 4800.00"
                value={updateAmount}
                onChange={e => setUpdateAmount(e.target.value)}
                required
                autoFocus
              />
              <Label>Note (optional)</Label>
              <Input
                placeholder="e.g. Monthly payment"
                value={updateNote}
                onChange={e => setUpdateNote(e.target.value)}
              />
              <ModalActions>
                <CancelBtn type="button" onClick={() => setShowDebtUpdate(null)}>Cancel</CancelBtn>
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
              <Input placeholder="e.g. Chase Sapphire Card" value={newDebt.title} onChange={e => setNewDebt(f => ({ ...f, title: e.target.value }))} required />
              <Label>Type</Label>
              <Select value={newDebt.debt_type} onChange={e => setNewDebt(f => ({ ...f, debt_type: e.target.value }))}>
                {DEBT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
              <Row>
                <div style={{ flex: 1 }}>
                  <Label>Original Amount ($)</Label>
                  <Input type="number" step="0.01" placeholder="10000" value={newDebt.original_amount} onChange={e => setNewDebt(f => ({ ...f, original_amount: e.target.value }))} required />
                </div>
                <div style={{ flex: 1 }}>
                  <Label>Current Balance ($)</Label>
                  <Input type="number" step="0.01" placeholder="8500" value={newDebt.current_balance} onChange={e => setNewDebt(f => ({ ...f, current_balance: e.target.value }))} required />
                </div>
              </Row>
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
              <Row>
                <div style={{ flex: 1 }}>
                  <Label>Amount ($)</Label>
                  <Input type="number" step="0.01" placeholder="2500" value={newUpcoming.amount} onChange={e => setNewUpcoming(f => ({ ...f, amount: e.target.value }))} required />
                </div>
                <div style={{ flex: 1 }}>
                  <Label>Expected Date</Label>
                  <Input type="date" value={newUpcoming.expected_date} onChange={e => setNewUpcoming(f => ({ ...f, expected_date: e.target.value }))} required />
                </div>
              </Row>
              <ModalActions>
                <CancelBtn type="button" onClick={() => setShowAddUpcoming(false)}>Cancel</CancelBtn>
                <SubmitBtn type="submit">Add</SubmitBtn>
              </ModalActions>
            </Form>
          </ModalBox>
        </Modal>
      )}

      {showUpdate && (
        <Modal onClick={() => setShowUpdate(null)}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalTitle>Update Balance</ModalTitle>
            <ModalGoalName>{showUpdate.title}</ModalGoalName>
            <Form onSubmit={handleUpdate}>
              <Label>Current Balance ($)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 3200.00"
                value={updateAmount}
                onChange={e => setUpdateAmount(e.target.value)}
                required
                autoFocus
              />
              <Label>Note (optional)</Label>
              <Input
                placeholder="e.g. Added paycheck deposit"
                value={updateNote}
                onChange={e => setUpdateNote(e.target.value)}
              />
              <ModalActions>
                <CancelBtn type="button" onClick={() => setShowUpdate(null)}>Cancel</CancelBtn>
                <SubmitBtn type="submit">Save</SubmitBtn>
              </ModalActions>
            </Form>
          </ModalBox>
        </Modal>
      )}

      {showAddGoal && (
        <Modal onClick={() => setShowAddGoal(false)}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalTitle>New Financial Goal</ModalTitle>
            <Form onSubmit={handleAddGoal}>
              <Label>Title</Label>
              <Input placeholder="e.g. Emergency Fund" value={newGoal.title} onChange={e => setNewGoal(f => ({ ...f, title: e.target.value }))} required />
              <Label>Description (optional)</Label>
              <Textarea placeholder="What is this goal for?" value={newGoal.description} onChange={e => setNewGoal(f => ({ ...f, description: e.target.value }))} rows={2} />
              <Row>
                <div style={{ flex: 1 }}>
                  <Label>Target Amount ($)</Label>
                  <Input type="number" step="0.01" placeholder="25000" value={newGoal.target_amount} onChange={e => setNewGoal(f => ({ ...f, target_amount: e.target.value }))} required />
                </div>
                <div style={{ flex: 1 }}>
                  <Label>Current Amount ($)</Label>
                  <Input type="number" step="0.01" placeholder="0" value={newGoal.current_amount} onChange={e => setNewGoal(f => ({ ...f, current_amount: e.target.value }))} />
                </div>
              </Row>
              <ModalActions>
                <CancelBtn type="button" onClick={() => setShowAddGoal(false)}>Cancel</CancelBtn>
                <SubmitBtn type="submit">Create Goal</SubmitBtn>
              </ModalActions>
            </Form>
          </ModalBox>
        </Modal>
      )}
    </Page>
  );
}

const Page = styled.div`padding: 40px 48px; max-width: 900px; @media (max-width: 768px) { padding: 24px 16px; }`;
const PageHeader = styled.div`display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px;`;
const PageTitle = styled.h1`font-family: 'DM Serif Display', serif; font-size: 1.8rem; font-weight: 400; color: #F5ECD8;`;
const PageSub = styled.p`color: #8C7050; font-size: 0.85rem; margin-top: 2px;`;
const AddBtn = styled.button`background: #FBBF24; color: #1C1208; border: none; border-radius: 8px; padding: 10px 18px; font-weight: 600; font-size: 0.88rem; &:hover { opacity: 0.9; }`;

const ProjectionBanner = styled.div<{ dim?: boolean }>`
  display: flex; align-items: center; gap: 16px;
  background: #261A0C; border: 1px solid #3E2A14; border-radius: 12px;
  padding: 16px 20px; margin-bottom: 28px;
  opacity: ${p => p.dim ? 0.6 : 1};
`;
const BannerIcon = styled.span`font-size: 1.2rem;`;
const BannerTitle = styled.p`font-size: 0.88rem; font-weight: 600; color: #F5ECD8;`;
const BannerSub = styled.p`font-size: 0.75rem; color: #8C7050; margin-top: 2px;`;
const BannerAmount = styled.div<{ positive?: boolean }>`
  margin-left: auto; font-family: 'DM Serif Display', serif; font-size: 1.4rem;
  color: ${p => p.positive ? '#FBBF24' : '#F07050'};
`;

const GoalList = styled.div`display: flex; flex-direction: column; gap: 24px;`;
const Empty = styled.p`color: #6B5038; text-align: center; padding: 64px 0;`;

const GoalCard = styled.div`
  background: #261A0C; border: 1px solid #3E2A14; border-radius: 16px;
  padding: 28px; border-left: 3px solid #FBBF24;
`;
const GoalTop = styled.div`margin-bottom: 20px;`;
const GoalTitleRow = styled.div`display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;`;
const GoalName = styled.h2`font-family: 'DM Serif Display', serif; font-size: 1.3rem; font-weight: 400; color: #F5ECD8;`;
const GoalDesc = styled.p`font-size: 0.83rem; color: #8C7050; margin-top: 6px; line-height: 1.6;`;
const GoalActions = styled.div`display: flex; gap: 8px; flex-shrink: 0;`;

const SmallBtn = styled.button<{ danger?: boolean }>`
  padding: 5px 12px; border-radius: 6px; font-size: 0.75rem;
  border: 1px solid ${p => p.danger ? '#F07050' : '#3E2A14'};
  background: transparent; color: ${p => p.danger ? '#F07050' : '#8C7050'};
  &:hover { opacity: 0.8; }
`;

const AmountRow = styled.div`display: flex; align-items: center; gap: 0; margin-bottom: 20px; flex-wrap: wrap; gap: 16px;`;
const AmountBlock = styled.div``;
const AmountLabel = styled.p`font-size: 0.72rem; color: #8C7050; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;`;
const AmountValue = styled.p<{ muted?: boolean; warn?: boolean; accent?: boolean }>`
  font-family: 'DM Serif Display', serif; font-size: 1.4rem;
  color: ${p => p.accent ? '#FBBF24' : p.warn ? '#E8A840' : p.muted ? '#6B5038' : '#F5ECD8'};
`;
const AmountDivider = styled.div`width: 1px; height: 32px; background: #3E2A14; align-self: center;`;

const ProgressSection = styled.div`margin-bottom: 24px;`;
const ProgressBar = styled.div`
  height: 10px; background: #3E2A14; border-radius: 6px; overflow: hidden; position: relative;
`;
const ProgressFill = styled.div`
  height: 100%; background: linear-gradient(90deg, #FBBF24, #E8A840);
  border-radius: 6px; transition: width 0.5s ease; position: relative;
`;
const ProgressLabel = styled.span`
  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  font-size: 0.65rem; font-weight: 700; color: #1C1208;
`;

const ChartWrap = styled.div`margin-top: 8px;`;
const ChartTitle = styled.p`font-size: 0.75rem; color: #6B5038; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;`;
const NoHistory = styled.p`font-size: 0.82rem; color: #6B5038; font-style: italic; text-align: center; padding: 12px 0;`;

const NetBanner = styled.div<{ positive?: boolean }>`
  display: flex; align-items: center; gap: 20px;
  background: #261A0C; border: 1px solid ${p => p.positive ? '#FBBF2440' : '#F0705040'};
  border-radius: 12px; padding: 18px 24px; margin-bottom: 32px; flex-wrap: wrap;
`;
const NetBlock = styled.div`display: flex; flex-direction: column; align-items: center;`;
const NetLabel = styled.p`font-size: 0.72rem; color: #8C7050; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;`;
const NetOp = styled.span`font-size: 1.4rem; color: #6B5038; font-family: 'DM Serif Display', serif; padding-bottom: 2px;`;

const SectionHeader = styled.div`display: flex; justify-content: space-between; align-items: center; margin: 36px 0 20px;`;
const SectionTitle = styled.h2`font-family: 'DM Serif Display', serif; font-size: 1.4rem; font-weight: 400; color: #F5ECD8;`;

const DebtCard = styled.div`
  background: #261A0C; border: 1px solid #3E2A14; border-radius: 16px;
  padding: 28px; border-left: 3px solid #F07050;
`;
const DebtTypeBadge = styled.span`
  font-size: 0.72rem; background: rgba(240,112,80,0.12); color: #F07050;
  border: 1px solid #F0705040; border-radius: 4px; padding: 2px 8px; white-space: nowrap;
`;
const DebtProgressFill = styled.div`
  height: 100%; background: linear-gradient(90deg, #F07050, #E85030);
  border-radius: 6px; transition: width 0.5s ease; position: relative;
`;

const UpcomingList = styled.div`
  background: #261A0C; border: 1px solid #3E2A14; border-radius: 12px;
  overflow: hidden; margin-bottom: 8px;
`;
const UpcomingRow = styled.div`
  display: flex; align-items: center; gap: 12px;
  padding: 14px 20px; border-bottom: 1px solid #3E2A14;
  &:last-child { border-bottom: none; }
`;
const UpcomingInfo = styled.div`flex: 1;`;
const UpcomingTitle = styled.p`font-size: 0.9rem; color: #F5ECD8; font-weight: 500;`;
const UpcomingDate = styled.p`font-size: 0.75rem; color: #8C7050; margin-top: 2px;`;
const UpcomingAmount = styled.span`
  font-family: 'DM Serif Display', serif; font-size: 1.2rem; color: #6BCB8B; white-space: nowrap;
`;
const UpcomingTotal = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 20px; background: rgba(107,203,139,0.06);
  font-size: 0.8rem; color: #6BCB8B; font-weight: 600; letter-spacing: 0.03em;
`;

const NetValue = styled.p<{ muted?: boolean; warn?: boolean; debt?: boolean; upcoming?: boolean; net?: boolean; positive?: boolean }>`
  font-family: 'DM Serif Display', serif; font-size: 1.5rem;
  color: ${p => p.net ? (p.positive ? '#FBBF24' : '#F07050') : p.debt ? '#F07050' : p.upcoming ? '#6BCB8B' : '#F5ECD8'};
`;

const Select = styled.select`width: 100%; background: #1C1208; border: 1px solid #3E2A14; border-radius: 8px; padding: 10px 14px; color: #F5ECD8; outline: none; &:focus { border-color: #FBBF24; } option { background: #1C1208; }`;

const Modal = styled.div`position: fixed; inset: 0; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px;`;
const ModalBox = styled.div`background: #261A0C; border: 1px solid #3E2A14; border-radius: 16px; padding: 32px; width: 100%; max-width: 440px;`;
const ModalTitle = styled.h2`font-family: 'DM Serif Display', serif; font-size: 1.3rem; font-weight: 400; color: #F5ECD8; margin-bottom: 4px;`;
const ModalGoalName = styled.p`font-size: 0.83rem; color: #8C7050; margin-bottom: 20px;`;
const Form = styled.form`display: flex; flex-direction: column; gap: 14px;`;
const Label = styled.label`font-size: 0.8rem; color: #C4A870; display: block; margin-bottom: 4px;`;
const Input = styled.input`width: 100%; background: #1C1208; border: 1px solid #3E2A14; border-radius: 8px; padding: 10px 14px; color: #F5ECD8; outline: none; &:focus { border-color: #FBBF24; } &::placeholder { color: #6B5038; }`;
const Textarea = styled.textarea`width: 100%; background: #1C1208; border: 1px solid #3E2A14; border-radius: 8px; padding: 10px 14px; color: #F5ECD8; outline: none; resize: vertical; &:focus { border-color: #FBBF24; } &::placeholder { color: #6B5038; }`;
const Row = styled.div`display: flex; gap: 12px;`;
const ModalActions = styled.div`display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px;`;
const CancelBtn = styled.button`background: none; border: 1px solid #3E2A14; border-radius: 8px; color: #8C7050; padding: 9px 18px; font-size: 0.88rem; &:hover { border-color: #8C7050; }`;
const SubmitBtn = styled.button`background: #FBBF24; color: #1C1208; border: none; border-radius: 8px; padding: 9px 18px; font-weight: 600; font-size: 0.88rem; &:hover { opacity: 0.9; }`;
