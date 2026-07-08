import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import api from '../api';

interface Habit { id: number; name: string; description: string; color: string; }
interface HabitLog { habit_id: number; completed_date: string; }
interface StreakMap { [habitId: number]: number; }

const COLORS = ['#FBBF24', '#E8A840', '#F09060', '#EAD050', '#D4884C', '#F5B830', '#F07050'];

export default function Habits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [streaks, setStreaks] = useState<StreakMap>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: '#FBBF24' });
  const today = format(new Date(), 'yyyy-MM-dd');
  const last30 = subDays(new Date(), 29);
  const days = eachDayOfInterval({ start: last30, end: new Date() });

  const fetchAll = async () => {
    const [h, l] = await Promise.all([
      api.get('/habits'),
      api.get(`/habits/logs?start=${format(last30, 'yyyy-MM-dd')}&end=${today}`),
    ]);
    setHabits(h.data);
    setLogs(l.data);

    const sm: StreakMap = {};
    await Promise.all(h.data.map(async (habit: Habit) => {
      const { data } = await api.get(`/habits/${habit.id}/streak`);
      sm[habit.id] = data.streak;
    }));
    setStreaks(sm);
  };

  useEffect(() => { fetchAll(); }, []);

  const isLogged = (habitId: number, date: string) =>
    logs.some(l => l.habit_id === habitId && l.completed_date?.startsWith(date));

  const toggleToday = async (habit: Habit) => {
    if (isLogged(habit.id, today)) {
      await api.delete(`/habits/${habit.id}/log?date=${today}`);
    } else {
      await api.post(`/habits/${habit.id}/log`, { date: today });
    }
    fetchAll();
  };

  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/habits', form);
    setShowForm(false);
    setForm({ name: '', description: '', color: '#FBBF24' });
    fetchAll();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this habit?')) return;
    await api.delete(`/habits/${id}`);
    fetchAll();
  };

  const todayDone = habits.filter(h => isLogged(h.id, today)).length;
  const score = habits.length ? Math.round((todayDone / habits.length) * 100) : 0;

  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>Habits</PageTitle>
          <PageSub>Build streaks, build discipline</PageSub>
        </div>
        <AddBtn onClick={() => setShowForm(true)}>+ New Habit</AddBtn>
      </PageHeader>

      {habits.length > 0 && (
        <TodayCard>
          <TodayLeft>
            <TodayLabel>Today's Score</TodayLabel>
            <TodayScore>{score}%</TodayScore>
            <TodayDetail>{todayDone} of {habits.length} habits done</TodayDetail>
          </TodayLeft>
          <ScoreRing score={score}>
            <RingText>{todayDone}/{habits.length}</RingText>
          </ScoreRing>
        </TodayCard>
      )}

      <HabitList>
        {habits.length === 0 && <Empty>No habits yet. Add one to start tracking your streaks.</Empty>}
        {habits.map(h => {
          const done = isLogged(h.id, today);
          return (
            <HabitCard key={h.id} done={done} color={h.color}>
              <HabitLeft>
                <CheckBtn done={done} color={h.color} onClick={() => toggleToday(h)}>{done && '✓'}</CheckBtn>
                <HabitInfo>
                  <HabitName done={done}>{h.name}</HabitName>
                  {h.description && <HabitDesc>{h.description}</HabitDesc>}
                </HabitInfo>
              </HabitLeft>
              <HabitRight>
                <StreakBadge color={h.color}>🔥 {streaks[h.id] ?? 0} day{streaks[h.id] !== 1 ? 's' : ''}</StreakBadge>
                <DeleteBtn onClick={() => handleDelete(h.id)}>×</DeleteBtn>
              </HabitRight>
            </HabitCard>
          );
        })}
      </HabitList>

      {habits.length > 0 && (
        <HeatmapSection>
          <SectionTitle>Last 30 Days</SectionTitle>
          {habits.map(h => (
            <HeatmapRow key={h.id}>
              <HeatmapLabel>{h.name}</HeatmapLabel>
              <HeatmapDays>
                {days.map(d => {
                  const dateStr = format(d, 'yyyy-MM-dd');
                  const done = isLogged(h.id, dateStr);
                  return <HeatDot key={dateStr} done={done} color={h.color} title={dateStr} />;
                })}
              </HeatmapDays>
            </HeatmapRow>
          ))}
        </HeatmapSection>
      )}

      {showForm && (
        <Modal onClick={() => setShowForm(false)}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalTitle>New Habit</ModalTitle>
            <Form onSubmit={handleAddHabit}>
              <Label>Habit Name</Label>
              <Input placeholder="e.g. Read 30 minutes" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              <Label>Description (optional)</Label>
              <Textarea placeholder="Why is this habit important?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
              <Label>Color</Label>
              <ColorRow>
                {COLORS.map(c => <ColorSwatch key={c} color={c} selected={form.color === c} onClick={() => setForm(f => ({ ...f, color: c }))} type="button" />)}
              </ColorRow>
              <ModalActions>
                <CancelBtn type="button" onClick={() => setShowForm(false)}>Cancel</CancelBtn>
                <SubmitBtn type="submit">Create Habit</SubmitBtn>
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
const TodayCard = styled.div`background: #261A0C; border: 1px solid #3E2A14; border-radius: 12px; padding: 24px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;`;
const TodayLeft = styled.div``;
const TodayLabel = styled.p`font-size: 0.75rem; color: #8C7050; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;`;
const TodayScore = styled.div`font-family: 'DM Serif Display', serif; font-size: 2.2rem; color: #FBBF24; line-height: 1;`;
const TodayDetail = styled.p`font-size: 0.82rem; color: #6B5038; margin-top: 4px;`;
const ScoreRing = styled.div<{ score: number }>`width: 64px; height: 64px; border-radius: 50%; background: conic-gradient(#FBBF24 ${p => p.score * 3.6}deg, #3E2A14 0deg); display: flex; align-items: center; justify-content: center; position: relative; &::before { content: ''; position: absolute; width: 48px; height: 48px; border-radius: 50%; background: #261A0C; }`;
const RingText = styled.span`font-size: 0.78rem; font-weight: 600; color: #F5ECD8; position: relative; z-index: 1;`;
const HabitList = styled.div`display: flex; flex-direction: column; gap: 10px; margin-bottom: 32px;`;
const HabitCard = styled.div<{ done: boolean; color: string }>`background: #261A0C; border: 1px solid ${p => p.done ? p.color + '50' : '#3E2A14'}; border-radius: 12px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; transition: border-color 0.2s;`;
const HabitLeft = styled.div`display: flex; align-items: center; gap: 14px;`;
const CheckBtn = styled.button<{ done: boolean; color: string }>`width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${p => p.done ? p.color : '#3E2A14'}; background: ${p => p.done ? p.color : 'transparent'}; color: #1C1208; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; transition: all 0.2s; &:hover { border-color: ${p => p.color}; }`;
const HabitInfo = styled.div``;
const HabitName = styled.p<{ done: boolean }>`font-size: 0.95rem; color: ${p => p.done ? '#6B5038' : '#F5ECD8'}; text-decoration: ${p => p.done ? 'line-through' : 'none'};`;
const HabitDesc = styled.p`font-size: 0.78rem; color: #6B5038; margin-top: 2px;`;
const HabitRight = styled.div`display: flex; align-items: center; gap: 12px;`;
const StreakBadge = styled.span<{ color: string }>`font-size: 0.78rem; color: ${p => p.color}; background: ${p => p.color}20; padding: 4px 10px; border-radius: 20px;`;
const DeleteBtn = styled.button`background: none; border: none; color: #6B5038; font-size: 1.1rem; padding: 2px 4px; &:hover { color: #F07050; }`;
const HeatmapSection = styled.div`background: #261A0C; border: 1px solid #3E2A14; border-radius: 12px; padding: 20px;`;
const SectionTitle = styled.h2`font-size: 0.82rem; font-weight: 600; color: #8C7050; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;`;
const HeatmapRow = styled.div`display: flex; align-items: center; gap: 12px; margin-bottom: 8px; &:last-child { margin-bottom: 0; }`;
const HeatmapLabel = styled.span`font-size: 0.78rem; color: #8C7050; min-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
const HeatmapDays = styled.div`display: flex; gap: 3px; flex-wrap: wrap;`;
const HeatDot = styled.div<{ done: boolean; color: string }>`width: 10px; height: 10px; border-radius: 2px; background: ${p => p.done ? p.color : '#3E2A14'}; transition: background 0.2s;`;
const Empty = styled.p`color: #6B5038; padding: 40px; text-align: center;`;
const Modal = styled.div`position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px;`;
const ModalBox = styled.div`background: #261A0C; border: 1px solid #3E2A14; border-radius: 16px; padding: 32px; width: 100%; max-width: 420px;`;
const ModalTitle = styled.h2`font-family: 'DM Serif Display', serif; font-size: 1.3rem; font-weight: 400; color: #F5ECD8; margin-bottom: 24px;`;
const Form = styled.form`display: flex; flex-direction: column; gap: 12px;`;
const Label = styled.label`font-size: 0.8rem; color: #C4A870; display: block; margin-bottom: 2px;`;
const Input = styled.input`width: 100%; background: #1C1208; border: 1px solid #3E2A14; border-radius: 8px; padding: 10px 14px; color: #F5ECD8; outline: none; &:focus { border-color: #FBBF24; } &::placeholder { color: #6B5038; }`;
const Textarea = styled.textarea`width: 100%; background: #1C1208; border: 1px solid #3E2A14; border-radius: 8px; padding: 10px 14px; color: #F5ECD8; outline: none; resize: vertical; &:focus { border-color: #FBBF24; } &::placeholder { color: #6B5038; }`;
const ColorRow = styled.div`display: flex; gap: 8px;`;
const ColorSwatch = styled.button<{ color: string; selected: boolean }>`width: 24px; height: 24px; border-radius: 50%; background: ${p => p.color}; border: 2px solid ${p => p.selected ? '#F5ECD8' : 'transparent'}; padding: 0;`;
const ModalActions = styled.div`display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px;`;
const CancelBtn = styled.button`background: none; border: 1px solid #3E2A14; border-radius: 8px; color: #8C7050; padding: 9px 18px; font-size: 0.88rem; &:hover { border-color: #8C7050; }`;
const SubmitBtn = styled.button`background: #FBBF24; color: #1C1208; border: none; border-radius: 8px; padding: 9px 18px; font-weight: 600; font-size: 0.88rem; &:hover { opacity: 0.9; }`;
