import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../api';

interface Task {
  id: number;
  title: string;
  priority: 'high' | 'medium' | 'low';
  due_date: string | null;
  due_time: string | null;
  status: 'todo' | 'in_progress' | 'done';
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  recurrence_days: number[] | null;
  completed_today: boolean;
}

const PRIORITY_COLOR = { high: '#F07050', medium: '#FBBF24', low: '#8C7050' };

export default function Schedule() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchTasks = async () => {
    const { data } = await api.get('/tasks');
    setTasks(data);
  };

  useEffect(() => { fetchTasks(); }, []);

  const isTaskToday = (t: Task) => {
    if (t.recurrence === 'daily') return true;
    if (t.recurrence === 'weekly') return t.recurrence_days?.includes(new Date().getDay()) ?? false;
    if (t.recurrence === 'monthly') return t.recurrence_days?.includes(new Date().getDate()) ?? false;
    if (t.status === 'done') return false;
    if (!t.due_date) return true;
    return t.due_date <= today;
  };

  const isDone = (t: Task) =>
    t.recurrence !== 'none' ? t.completed_today : t.status === 'done';

  const toggleDone = async (t: Task) => {
    if (t.recurrence !== 'none') {
      t.completed_today
        ? await api.delete(`/tasks/${t.id}/complete`)
        : await api.post(`/tasks/${t.id}/complete`);
    } else {
      await api.put(`/tasks/${t.id}`, {
        title: t.title,
        priority: t.priority,
        due_date: t.due_date,
        due_time: t.due_time,
        recurrence: t.recurrence,
        recurrence_days: t.recurrence_days,
        status: t.status === 'done' ? 'todo' : 'done',
      });
    }
    fetchTasks();
  };

  const todayTasks = tasks.filter(isTaskToday);
  const timed = todayTasks
    .filter(t => t.due_time)
    .sort((a, b) => a.due_time!.localeCompare(b.due_time!));
  const anytime = todayTasks.filter(t => !t.due_time);

  const done = todayTasks.filter(isDone).length;
  const pct = todayTasks.length ? Math.round((done / todayTasks.length) * 100) : 0;

  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>Schedule</PageTitle>
          <PageSub>{format(new Date(), 'EEEE, MMMM d')} · Today's agenda</PageSub>
        </div>
        <ManageLink to="/tasks">Add or edit tasks →</ManageLink>
      </PageHeader>

      {todayTasks.length > 0 && (
        <SummaryCard>
          <SummaryLeft>
            <SummaryLabel>Today's Progress</SummaryLabel>
            <SummaryScore>{done} / {todayTasks.length}</SummaryScore>
          </SummaryLeft>
          <ProgressRing pct={pct}>
            <RingInner>{pct}%</RingInner>
          </ProgressRing>
        </SummaryCard>
      )}

      {todayTasks.length === 0 ? (
        <Empty>Nothing scheduled for today. <Link to="/tasks">Add a task →</Link></Empty>
      ) : (
        <Timeline>
          {timed.map(t => (
            <TimelineRow key={t.id}>
              <TimeLabel>{formatTime(t.due_time!)}</TimeLabel>
              <TimelineLine done={isDone(t)} />
              <TaskCard done={isDone(t)} priority={t.priority} onClick={() => toggleDone(t)}>
                <CheckDot done={isDone(t)} priority={t.priority}>{isDone(t) && '✓'}</CheckDot>
                <TaskTitle done={isDone(t)}>{t.title}</TaskTitle>
              </TaskCard>
            </TimelineRow>
          ))}

          {anytime.length > 0 && (
            <>
              <AnytimeHeader>Anytime</AnytimeHeader>
              {anytime.map(t => (
                <TimelineRow key={t.id}>
                  <TimeLabel muted>—</TimeLabel>
                  <TimelineLine done={isDone(t)} />
                  <TaskCard done={isDone(t)} priority={t.priority} onClick={() => toggleDone(t)}>
                    <CheckDot done={isDone(t)} priority={t.priority}>{isDone(t) && '✓'}</CheckDot>
                    <TaskTitle done={isDone(t)}>{t.title}</TaskTitle>
                  </TaskCard>
                </TimelineRow>
              ))}
            </>
          )}
        </Timeline>
      )}
    </Page>
  );
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

const Page = styled.div`padding: 40px 48px; max-width: 720px; @media (max-width: 768px) { padding: 24px 16px; }`;
const PageHeader = styled.div`display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; gap: 16px; flex-wrap: wrap;`;
const PageTitle = styled.h1`font-family: 'DM Serif Display', serif; font-size: 1.8rem; font-weight: 400; color: #F5ECD8;`;
const PageSub = styled.p`color: #8C7050; font-size: 0.85rem; margin-top: 2px;`;
const ManageLink = styled(Link)`font-size: 0.85rem; color: #FBBF24; white-space: nowrap; &:hover { text-decoration: underline; }`;

const SummaryCard = styled.div`background: #261A0C; border: 1px solid #3E2A14; border-radius: 12px; padding: 24px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: center;`;
const SummaryLeft = styled.div``;
const SummaryLabel = styled.p`font-size: 0.75rem; color: #8C7050; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;`;
const SummaryScore = styled.div`font-family: 'DM Serif Display', serif; font-size: 2.2rem; color: #FBBF24; line-height: 1;`;
const ProgressRing = styled.div<{ pct: number }>`width: 64px; height: 64px; border-radius: 50%; background: conic-gradient(#FBBF24 ${p => p.pct * 3.6}deg, #3E2A14 0deg); display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0; &::before { content: ''; position: absolute; width: 48px; height: 48px; border-radius: 50%; background: #261A0C; }`;
const RingInner = styled.span`font-size: 0.78rem; font-weight: 600; color: #F5ECD8; position: relative; z-index: 1;`;

const Empty = styled.p`color: #6B5038; text-align: center; padding: 48px 0; a { color: #FBBF24; &:hover { text-decoration: underline; } }`;

const Timeline = styled.div`display: flex; flex-direction: column;`;

const TimelineRow = styled.div`display: grid; grid-template-columns: 72px 20px 1fr; align-items: center; min-height: 52px;`;

const TimeLabel = styled.span<{ muted?: boolean }>`font-size: 0.78rem; color: ${p => p.muted ? '#3E2A14' : '#8C7050'}; text-align: right; padding-right: 12px; white-space: nowrap;`;

const TimelineLine = styled.div<{ done: boolean }>`
  width: 2px;
  height: 100%;
  min-height: 52px;
  margin: 0 auto;
  background: ${p => p.done ? '#FBBF24' : '#3E2A14'};
  position: relative;
`;

const AnytimeHeader = styled.div`grid-column: 1 / -1; font-size: 0.75rem; color: #8C7050; text-transform: uppercase; letter-spacing: 0.05em; margin: 20px 0 8px 92px;`;

const TaskCard = styled.div<{ done: boolean; priority: Task['priority'] }>`
  display: flex;
  align-items: center;
  gap: 12px;
  background: #261A0C;
  border: 1px solid #3E2A14;
  border-left: 3px solid ${p => p.done ? '#3E2A14' : PRIORITY_COLOR[p.priority]};
  border-radius: 10px;
  padding: 12px 16px;
  margin: 4px 0 4px 12px;
  cursor: pointer;
  opacity: ${p => p.done ? 0.55 : 1};
  transition: opacity 0.2s, border-color 0.2s;
  &:hover { border-color: ${p => PRIORITY_COLOR[p.priority]}; }
`;

const CheckDot = styled.div<{ done: boolean; priority: Task['priority'] }>`
  width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid ${p => p.done ? '#FBBF24' : PRIORITY_COLOR[p.priority]};
  background: ${p => p.done ? '#FBBF24' : 'transparent'};
  color: #1C1208; font-size: 0.6rem; font-weight: 700;
`;

const TaskTitle = styled.span<{ done: boolean }>`
  font-size: 0.9rem;
  color: ${p => p.done ? '#6B5038' : '#F5ECD8'};
  text-decoration: ${p => p.done ? 'line-through' : 'none'};
`;
