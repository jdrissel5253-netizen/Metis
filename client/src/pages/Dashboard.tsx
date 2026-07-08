import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../api';
import { useAuth } from '../context/AuthContext';

interface Goal { id: number; title: string; progress: number; status: string; target_date: string | null; }
interface Habit { id: number; name: string; color: string; }
interface HabitLog { habit_id: number; completed_date: string; }
interface MoneySummary { income: number; expense: number; net: number; }

export default function Dashboard() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [todayLogs, setTodayLogs] = useState<HabitLog[]>([]);
  const [summary, setSummary] = useState<MoneySummary>({ income: 0, expense: 0, net: 0 });
  const today = new Date();

  useEffect(() => {
    const m = today.getMonth() + 1;
    const y = today.getFullYear();
    const todayStr = format(today, 'yyyy-MM-dd');

    Promise.all([
      api.get('/goals'),
      api.get('/habits'),
      api.get(`/habits/logs?start=${todayStr}&end=${todayStr}`),
      api.get(`/money/summary?month=${m}&year=${y}`),
    ]).then(([g, h, l, s]) => {
      setGoals(g.data.filter((g: Goal) => g.status === 'active').slice(0, 5));
      setHabits(h.data);
      setTodayLogs(l.data);
      setSummary(s.data);
    }).catch(() => {});
  }, []);

  const completedToday = new Set(todayLogs.map(l => l.habit_id));
  const habitScore = habits.length ? Math.round((completedToday.size / habits.length) * 100) : 0;
  const avgGoalProgress = goals.length ? Math.round(goals.reduce((a, g) => a + g.progress, 0) / goals.length) : 0;

  return (
    <Page>
      <Header>
        <Greeting>
          Good {getTimeOfDay()}, <span>{user?.name?.split(' ')[0]}</span>
        </Greeting>
        <DateDisplay>{format(today, 'EEEE, MMMM d')}</DateDisplay>
      </Header>

      <SummaryRow>
        <SummaryCard accent="#FBBF24">
          <SummaryLabel>Goal Progress</SummaryLabel>
          <SummaryValue>{avgGoalProgress}%</SummaryValue>
          <SummaryNote>{goals.length} active goal{goals.length !== 1 ? 's' : ''}</SummaryNote>
        </SummaryCard>
        <SummaryCard accent={summary.net >= 0 ? '#FBBF24' : '#F07050'}>
          <SummaryLabel>This Month</SummaryLabel>
          <SummaryValue style={{ color: summary.net >= 0 ? '#FBBF24' : '#F07050' }}>
            {summary.net >= 0 ? '+' : ''}${summary.net.toFixed(0)}
          </SummaryValue>
          <SummaryNote>
            ${summary.income.toFixed(0)} in · ${summary.expense.toFixed(0)} out
          </SummaryNote>
        </SummaryCard>
        <SummaryCard accent="#E8A840">
          <SummaryLabel>Habits Today</SummaryLabel>
          <SummaryValue style={{ color: '#E8A840' }}>{completedToday.size}/{habits.length}</SummaryValue>
          <SummaryNote>{habitScore}% complete</SummaryNote>
        </SummaryCard>
      </SummaryRow>

      <Grid>
        <Section>
          <SectionHeader>
            <SectionTitle>Active Goals</SectionTitle>
            <SectionLink to="/goals">View all →</SectionLink>
          </SectionHeader>
          {goals.length === 0 ? (
            <Empty>No active goals yet. <Link to="/goals">Add one →</Link></Empty>
          ) : (
            goals.map(g => (
              <GoalRow key={g.id}>
                <GoalInfo>
                  <GoalTitle>{g.title}</GoalTitle>
                  {g.target_date && (
                    <GoalDate>Due {format(new Date(g.target_date), 'MMM d')}</GoalDate>
                  )}
                </GoalInfo>
                <ProgressArea>
                  <ProgressBar>
                    <ProgressFill style={{ width: `${g.progress}%` }} />
                  </ProgressBar>
                  <ProgressPct>{g.progress}%</ProgressPct>
                </ProgressArea>
              </GoalRow>
            ))
          )}
        </Section>

        <Section>
          <SectionHeader>
            <SectionTitle>Today's Habits</SectionTitle>
            <SectionLink to="/habits">Manage →</SectionLink>
          </SectionHeader>
          {habits.length === 0 ? (
            <Empty>No habits yet. <Link to="/habits">Add one →</Link></Empty>
          ) : (
            habits.map(h => (
              <HabitRow key={h.id}>
                <HabitDot done={completedToday.has(h.id)} color={h.color} />
                <HabitName done={completedToday.has(h.id)}>{h.name}</HabitName>
                {completedToday.has(h.id) && <DoneTag>Done</DoneTag>}
              </HabitRow>
            ))
          )}
        </Section>
      </Grid>
    </Page>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const Page = styled.div`
  padding: 40px 48px;
  max-width: 1000px;
  @media (max-width: 768px) { padding: 24px 16px; }
`;

const Header = styled.div`margin-bottom: 32px;`;

const Greeting = styled.h1`
  font-family: 'DM Serif Display', serif;
  font-size: 1.8rem;
  color: #F5ECD8;
  font-weight: 400;
  margin-bottom: 4px;
  span { color: #FBBF24; }
`;

const DateDisplay = styled.p`color: #8C7050; font-size: 0.9rem;`;

const SummaryRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 32px;
  @media (max-width: 640px) { grid-template-columns: 1fr; }
`;

const SummaryCard = styled.div<{ accent: string }>`
  background: #261A0C;
  border: 1px solid #3E2A14;
  border-radius: 12px;
  padding: 20px;
  border-top: 2px solid ${p => p.accent};
`;

const SummaryLabel = styled.p`
  font-size: 0.8rem;
  color: #8C7050;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
`;

const SummaryValue = styled.div`
  font-family: 'DM Serif Display', serif;
  font-size: 1.8rem;
  color: #FBBF24;
  line-height: 1;
  margin-bottom: 6px;
`;

const SummaryNote = styled.p`font-size: 0.78rem; color: #6B5038;`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const Section = styled.div`
  background: #261A0C;
  border: 1px solid #3E2A14;
  border-radius: 12px;
  padding: 24px;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const SectionTitle = styled.h2`
  font-size: 0.9rem;
  font-weight: 600;
  color: #8C7050;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const SectionLink = styled(Link)`
  font-size: 0.8rem;
  color: #FBBF24;
  &:hover { text-decoration: underline; }
`;

const Empty = styled.p`
  color: #6B5038;
  font-size: 0.88rem;
  a { color: #FBBF24; &:hover { text-decoration: underline; } }
`;

const GoalRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
  &:last-child { margin-bottom: 0; }
`;

const GoalInfo = styled.div`display: flex; justify-content: space-between; align-items: baseline;`;
const GoalTitle = styled.span`font-size: 0.9rem; color: #F5ECD8;`;
const GoalDate = styled.span`font-size: 0.75rem; color: #6B5038;`;

const ProgressArea = styled.div`display: flex; align-items: center; gap: 8px;`;

const ProgressBar = styled.div`
  flex: 1;
  height: 4px;
  background: #3E2A14;
  border-radius: 2px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: #FBBF24;
  border-radius: 2px;
  transition: width 0.3s ease;
`;

const ProgressPct = styled.span`font-size: 0.75rem; color: #8C7050; min-width: 32px; text-align: right;`;

const HabitRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #2E1E0A;
  &:last-child { border-bottom: none; }
`;

const HabitDot = styled.div<{ done: boolean; color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${p => p.done ? p.color : 'transparent'};
  border: 2px solid ${p => p.done ? p.color : '#3E2A14'};
  flex-shrink: 0;
  transition: all 0.2s;
`;

const HabitName = styled.span<{ done: boolean }>`
  font-size: 0.9rem;
  color: ${p => p.done ? '#6B5038' : '#F5ECD8'};
  text-decoration: ${p => p.done ? 'line-through' : 'none'};
  flex: 1;
`;

const DoneTag = styled.span`
  font-size: 0.7rem;
  color: #FBBF24;
  background: rgba(251,191,36,0.1);
  padding: 2px 8px;
  border-radius: 20px;
`;
