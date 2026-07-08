import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api';

interface Category { id: number; name: string; type: 'income' | 'expense'; budget_limit: number | null; color: string; }
interface Transaction { id: number; amount: number; description: string; date: string; type: 'income' | 'expense'; category_name: string; category_color: string; }
interface Summary { income: number; expense: number; net: number; }

const COLORS = ['#FBBF24', '#E8A840', '#F09060', '#EAD050', '#D4884C', '#F5B830', '#F07050'];

export default function Money() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary>({ income: 0, expense: 0, net: 0 });
  const [tab, setTab] = useState<'transactions' | 'categories'>('transactions');
  const [showTxForm, setShowTxForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [txForm, setTxForm] = useState({ category_id: '', amount: '', description: '', date: format(now, 'yyyy-MM-dd'), type: 'expense' as 'income' | 'expense' });
  const [catForm, setCatForm] = useState({ name: '', type: 'expense' as 'income' | 'expense', budget_limit: '', color: '#FBBF24' });

  const fetchAll = async () => {
    const [cats, txs, sum] = await Promise.all([
      api.get('/money/categories'),
      api.get(`/money/transactions?month=${month}&year=${year}`),
      api.get(`/money/summary?month=${month}&year=${year}`),
    ]);
    setCategories(cats.data);
    setTransactions(txs.data);
    setSummary(sum.data);
  };

  useEffect(() => { fetchAll(); }, [month, year]);

  const handleAddTx = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/money/transactions', { ...txForm, category_id: txForm.category_id || null });
    setShowTxForm(false);
    setTxForm({ category_id: '', amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), type: 'expense' });
    fetchAll();
  };

  const handleDeleteTx = async (id: number) => {
    await api.delete(`/money/transactions/${id}`);
    fetchAll();
  };

  const handleAddCat = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/money/categories', { ...catForm, budget_limit: catForm.budget_limit || null });
    setShowCatForm(false);
    setCatForm({ name: '', type: 'expense', budget_limit: '', color: '#FBBF24' });
    fetchAll();
  };

  const handleDeleteCat = async (id: number) => {
    if (!confirm('Delete this category?')) return;
    await api.delete(`/money/categories/${id}`);
    fetchAll();
  };

  const chartData = categories.filter(c => c.type === 'expense').map(c => {
    const spent = transactions.filter(t => t.category_name === c.name).reduce((s, t) => s + parseFloat(String(t.amount)), 0);
    return { name: c.name, spent, budget: c.budget_limit || 0 };
  }).filter(d => d.spent > 0 || d.budget > 0);

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>Money</PageTitle>
          <PageSub>Income, expenses, and budgets</PageSub>
        </div>
        <Controls>
          <MonthSelect value={month} onChange={e => setMonth(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </MonthSelect>
          <MonthSelect value={year} onChange={e => setYear(+e.target.value)}>
            {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </MonthSelect>
        </Controls>
      </PageHeader>

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
          <SectionTitle>Spending by Category</SectionTitle>
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

      <TabRow>
        <Tab active={tab === 'transactions'} onClick={() => setTab('transactions')}>Transactions</Tab>
        <Tab active={tab === 'categories'} onClick={() => setTab('categories')}>Categories</Tab>
        <AddBtn onClick={() => tab === 'transactions' ? setShowTxForm(true) : setShowCatForm(true)}>
          + Add {tab === 'transactions' ? 'Transaction' : 'Category'}
        </AddBtn>
      </TabRow>

      {tab === 'transactions' && (
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

      {tab === 'categories' && (
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
                    <MiniBar>
                      <MiniFill style={{ width: `${pct}%`, background: pct > 90 ? '#F07050' : c.color }} />
                    </MiniBar>
                  </>
                )}
              </CatCard>
            );
          })}
        </CatGrid>
      )}

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
    </Page>
  );
}

const Page = styled.div`padding: 40px 48px; max-width: 1000px; @media (max-width: 768px) { padding: 24px 16px; }`;
const PageHeader = styled.div`display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; flex-wrap: wrap; gap: 12px;`;
const PageTitle = styled.h1`font-family: 'DM Serif Display', serif; font-size: 1.8rem; font-weight: 400; color: #F5ECD8;`;
const PageSub = styled.p`color: #8C7050; font-size: 0.85rem; margin-top: 2px;`;
const Controls = styled.div`display: flex; gap: 8px;`;
const MonthSelect = styled.select`background: #261A0C; border: 1px solid #3E2A14; border-radius: 8px; padding: 8px 12px; color: #F5ECD8; font-size: 0.85rem; outline: none; &:focus { border-color: #FBBF24; }`;
const SummaryRow = styled.div`display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-bottom: 24px; @media (max-width: 640px) { grid-template-columns: 1fr; }`;
const SummaryCard = styled.div<{ accent: string }>`background: #261A0C; border: 1px solid #3E2A14; border-radius: 12px; padding: 18px; border-top: 2px solid ${p => p.accent};`;
const SLabel = styled.p`font-size: 0.75rem; color: #8C7050; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;`;
const SValue = styled.div`font-family: 'DM Serif Display', serif; font-size: 1.6rem;`;
const ChartSection = styled.div`background: #261A0C; border: 1px solid #3E2A14; border-radius: 12px; padding: 20px; margin-bottom: 24px;`;
const SectionTitle = styled.h2`font-size: 0.82rem; font-weight: 600; color: #8C7050; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;`;
const TabRow = styled.div`display: flex; align-items: center; gap: 8px; margin-bottom: 16px;`;
const Tab = styled.button<{ active: boolean }>`padding: 6px 14px; border-radius: 20px; border: 1px solid ${p => p.active ? '#FBBF24' : '#3E2A14'}; background: ${p => p.active ? 'rgba(251,191,36,0.12)' : 'transparent'}; color: ${p => p.active ? '#FBBF24' : '#8C7050'}; font-size: 0.82rem; &:hover { border-color: #FBBF24; color: #FBBF24; }`;
const AddBtn = styled.button`margin-left: auto; background: #FBBF24; color: #1C1208; border: none; border-radius: 8px; padding: 8px 14px; font-weight: 600; font-size: 0.82rem; &:hover { opacity: 0.9; }`;
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
const Empty = styled.p`color: #6B5038; padding: 40px; text-align: center;`;
const Modal = styled.div`position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px;`;
const ModalBox = styled.div`background: #261A0C; border: 1px solid #3E2A14; border-radius: 16px; padding: 32px; width: 100%; max-width: 440px;`;
const ModalTitle = styled.h2`font-family: 'DM Serif Display', serif; font-size: 1.3rem; font-weight: 400; color: #F5ECD8; margin-bottom: 24px;`;
const Form = styled.form`display: flex; flex-direction: column; gap: 12px;`;
const Label = styled.label`font-size: 0.8rem; color: #C4A870; display: block; margin-bottom: 2px;`;
const Input = styled.input`width: 100%; background: #1C1208; border: 1px solid #3E2A14; border-radius: 8px; padding: 10px 14px; color: #F5ECD8; outline: none; &:focus { border-color: #FBBF24; } &::placeholder { color: #6B5038; }`;
const Select = styled.select`width: 100%; background: #1C1208; border: 1px solid #3E2A14; border-radius: 8px; padding: 10px 14px; color: #F5ECD8; outline: none; &:focus { border-color: #FBBF24; }`;
const TypeToggle = styled.div`display: flex; gap: 8px;`;
const TypeBtn = styled.button<{ active: boolean; income?: boolean }>`flex: 1; padding: 8px; border-radius: 8px; border: 1px solid ${p => p.active ? (p.income ? '#FBBF24' : '#F07050') : '#3E2A14'}; background: ${p => p.active ? (p.income ? 'rgba(251,191,36,0.1)' : 'rgba(240,112,80,0.1)') : 'transparent'}; color: ${p => p.active ? (p.income ? '#FBBF24' : '#F07050') : '#8C7050'}; font-size: 0.85rem;`;
const ColorRow = styled.div`display: flex; gap: 8px; flex-wrap: wrap;`;
const ColorSwatch = styled.button<{ color: string; selected: boolean }>`width: 24px; height: 24px; border-radius: 50%; background: ${p => p.color}; border: 2px solid ${p => p.selected ? '#F5ECD8' : 'transparent'}; padding: 0;`;
const ModalActions = styled.div`display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px;`;
const CancelBtn = styled.button`background: none; border: 1px solid #3E2A14; border-radius: 8px; color: #8C7050; padding: 9px 18px; font-size: 0.88rem; &:hover { border-color: #8C7050; }`;
const SubmitBtn = styled.button`background: #FBBF24; color: #1C1208; border: none; border-radius: 8px; padding: 9px 18px; font-weight: 600; font-size: 0.88rem; &:hover { opacity: 0.9; }`;
