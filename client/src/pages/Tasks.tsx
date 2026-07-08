import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { format } from 'date-fns';
import api from '../api';

interface Subtask {
  id: number;
  title: string;
  completed: boolean;
}

interface Task {
  id: number;
  title: string;
  description: string | null;
  priority: 'high' | 'medium' | 'low';
  due_date: string | null;
  due_time: string | null;
  status: 'todo' | 'in_progress' | 'done';
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  recurrence_days: number[] | null;
  subtasks: Subtask[];
  completed_today: boolean;
  created_at: string;
}

type FilterType = 'today' | 'upcoming' | 'all';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PRIORITY_LABEL = { high: 'High', medium: 'Med', low: 'Low' };
const RECUR_LABEL = { none: '', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

const emptyForm = {
  title: '', description: '', priority: 'medium' as Task['priority'],
  due_date: '', due_time: '',
  recurrence: 'none' as Task['recurrence'], recurrence_days: [] as number[],
};

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<FilterType>('today');
  const [newSubtask, setNewSubtask] = useState<Record<number, string>>({});
  const [form, setForm] = useState(emptyForm);

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

  const isTaskUpcoming = (t: Task) =>
    t.recurrence === 'none' && !!t.due_date && t.due_date > today;

  const isDone = (t: Task) =>
    t.recurrence !== 'none' ? t.completed_today : t.status === 'done';

  const filteredTasks =
    filter === 'today' ? tasks.filter(isTaskToday) :
    filter === 'upcoming' ? tasks.filter(isTaskUpcoming) :
    tasks;

  const todayTasks = tasks.filter(isTaskToday);
  const todayDone = todayTasks.filter(isDone).length;
  const pct = todayTasks.length ? Math.round((todayDone / todayTasks.length) * 100) : 0;

  const toggleDone = async (t: Task) => {
    if (t.recurrence !== 'none') {
      t.completed_today
        ? await api.delete(`/tasks/${t.id}/complete`)
        : await api.post(`/tasks/${t.id}/complete`);
    } else {
      const { subtasks: _, completed_today: __, ...rest } = t as any;
      await api.put(`/tasks/${t.id}`, {
        ...rest,
        status: t.status === 'done' ? 'todo' : 'done',
      });
    }
    fetchTasks();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this task?')) return;
    await api.delete(`/tasks/${id}`);
    fetchTasks();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      due_date: form.due_date || null,
      due_time: form.due_time || null,
      recurrence_days: form.recurrence_days.length ? form.recurrence_days : null,
    };
    if (editTask) {
      await api.put(`/tasks/${editTask.id}`, { ...payload, status: editTask.status });
    } else {
      await api.post('/tasks', payload);
    }
    closeForm();
    fetchTasks();
  };

  const openEdit = (t: Task) => {
    setEditTask(t);
    setForm({
      title: t.title,
      description: t.description || '',
      priority: t.priority,
      due_date: t.due_date || '',
      due_time: t.due_time ? t.due_time.slice(0, 5) : '',
      recurrence: t.recurrence,
      recurrence_days: t.recurrence_days || [],
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditTask(null);
    setForm(emptyForm);
  };

  const toggleExpand = (id: number) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleDay = (dow: number) =>
    setForm(f => ({
      ...f,
      recurrence_days: f.recurrence_days.includes(dow)
        ? f.recurrence_days.filter(d => d !== dow)
        : [...f.recurrence_days, dow],
    }));

  const addSubtask = async (taskId: number) => {
    const text = newSubtask[taskId]?.trim();
    if (!text) return;
    await api.post(`/tasks/${taskId}/subtasks`, { title: text });
    setNewSubtask(p => ({ ...p, [taskId]: '' }));
    fetchTasks();
  };

  const toggleSubtask = async (taskId: number, subId: number, completed: boolean) => {
    await api.put(`/tasks/${taskId}/subtasks/${subId}`, { completed: !completed });
    fetchTasks();
  };

  const deleteSubtask = async (taskId: number, subId: number) => {
    await api.delete(`/tasks/${taskId}/subtasks/${subId}`);
    fetchTasks();
  };

  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>Tasks</PageTitle>
          <PageSub>Your daily action list</PageSub>
        </div>
        <AddBtn onClick={() => { closeForm(); setShowForm(true); }}>+ New Task</AddBtn>
      </PageHeader>

      {todayTasks.length > 0 && (
        <SummaryCard>
          <SummaryLeft>
            <SummaryLabel>Today's Progress</SummaryLabel>
            <SummaryScore>{todayDone} / {todayTasks.length}</SummaryScore>
            <SummarySub>
              {todayDone === todayTasks.length ? 'All done — great work!' : `${todayTasks.length - todayDone} left to go`}
            </SummarySub>
          </SummaryLeft>
          <ProgressRing pct={pct}>
            <RingInner>{pct}%</RingInner>
          </ProgressRing>
        </SummaryCard>
      )}

      <FilterRow>
        {(['today', 'upcoming', 'all'] as FilterType[]).map(f => (
          <FilterBtn key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f === 'today' ? 'Today' : f === 'upcoming' ? 'Upcoming' : 'All'}
            {f === 'today' && todayTasks.filter(t => !isDone(t)).length > 0 && (
              <CountPip>{todayTasks.filter(t => !isDone(t)).length}</CountPip>
            )}
          </FilterBtn>
        ))}
      </FilterRow>

      <TaskList>
        {filteredTasks.length === 0 && (
          <Empty>
            {filter === 'today' ? 'No tasks for today — add one to get started.' : 'Nothing here.'}
          </Empty>
        )}

        {filteredTasks.map(t => {
          const done = isDone(t);
          const isOpen = expanded.has(t.id);
          const subtaskDone = t.subtasks.filter(s => s.completed).length;
          const hasSubtasks = t.subtasks.length > 0;
          const isOverdue = t.recurrence === 'none' && !done && !!t.due_date && t.due_date < today;

          return (
            <TaskCard key={t.id} done={done} priority={t.priority}>
              <TaskMain>
                <CheckBtn done={done} priority={t.priority} onClick={() => toggleDone(t)}>
                  {done && '✓'}
                </CheckBtn>

                <TaskBody>
                  <TaskTop>
                    <TaskTitle done={done}>{t.title}</TaskTitle>
                    <Badges>
                      <PriorityBadge priority={t.priority}>{PRIORITY_LABEL[t.priority]}</PriorityBadge>
                      {t.due_time && <TimeBadge>⏱ {t.due_time.slice(0, 5)}</TimeBadge>}
                      {t.recurrence !== 'none' && (
                        <RecurBadge>↻ {RECUR_LABEL[t.recurrence]}</RecurBadge>
                      )}
                      {hasSubtasks && (
                        <SubBadge allDone={subtaskDone === t.subtasks.length}>
                          {subtaskDone}/{t.subtasks.length}
                        </SubBadge>
                      )}
                      {isOverdue && <OverdueBadge>Overdue</OverdueBadge>}
                    </Badges>
                  </TaskTop>
                  {t.description && !done && <TaskDesc>{t.description}</TaskDesc>}
                  {hasSubtasks && !isOpen && (
                    <SubBar>
                      <SubBarFill style={{ width: `${t.subtasks.length ? (subtaskDone / t.subtasks.length) * 100 : 0}%` }} />
                    </SubBar>
                  )}
                </TaskBody>

                <CardActions>
                  <ExpandBtn onClick={() => toggleExpand(t.id)} title="Toggle subtasks">
                    {isOpen ? '▴' : '▾'}
                  </ExpandBtn>
                  <SmallBtn onClick={() => openEdit(t)} title="Edit">✎</SmallBtn>
                  <SmallBtn danger onClick={() => handleDelete(t.id)} title="Delete">×</SmallBtn>
                </CardActions>
              </TaskMain>

              {isOpen && (
                <SubtaskSection>
                  {t.subtasks.length === 0 && (
                    <SubEmpty>No subtasks yet — add one below.</SubEmpty>
                  )}
                  {t.subtasks.map(s => (
                    <SubtaskRow key={s.id}>
                      <SubCheck
                        checked={s.completed}
                        onClick={() => toggleSubtask(t.id, s.id, s.completed)}
                      />
                      <SubTitle done={s.completed}>{s.title}</SubTitle>
                      <SubDelete onClick={() => deleteSubtask(t.id, s.id)}>×</SubDelete>
                    </SubtaskRow>
                  ))}
                  <SubtaskInputRow>
                    <SubtaskInput
                      placeholder="Add a subtask..."
                      value={newSubtask[t.id] || ''}
                      onChange={e => setNewSubtask(p => ({ ...p, [t.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addSubtask(t.id)}
                    />
                    <SubtaskAddBtn onClick={() => addSubtask(t.id)}>+</SubtaskAddBtn>
                  </SubtaskInputRow>
                </SubtaskSection>
              )}
            </TaskCard>
          );
        })}
      </TaskList>

      {showForm && (
        <Modal onClick={closeForm}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalTitle>{editTask ? 'Edit Task' : 'New Task'}</ModalTitle>
            <Form onSubmit={handleSubmit}>
              <Label>Title</Label>
              <Input
                placeholder="What needs to get done?"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
                autoFocus
              />

              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Details, context, or notes..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />

              <Label>Priority</Label>
              <PillRow>
                {(['high', 'medium', 'low'] as Task['priority'][]).map(p => (
                  <PriorityPill
                    key={p} type="button" priority={p} selected={form.priority === p}
                    onClick={() => setForm(f => ({ ...f, priority: p }))}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </PriorityPill>
                ))}
              </PillRow>

              <FormRow>
                <FormField>
                  <Label>Due Date</Label>
                  <Input type="date" value={form.due_date}
                    onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                </FormField>
                <FormField>
                  <Label>Due Time</Label>
                  <Input type="time" value={form.due_time}
                    onChange={e => setForm(f => ({ ...f, due_time: e.target.value }))} />
                </FormField>
              </FormRow>

              <Label>Recurrence</Label>
              <PillRow>
                {(['none', 'daily', 'weekly', 'monthly'] as Task['recurrence'][]).map(r => (
                  <RecurPill
                    key={r} type="button" selected={form.recurrence === r}
                    onClick={() => setForm(f => ({ ...f, recurrence: r, recurrence_days: [] }))}
                  >
                    {r === 'none' ? 'Once' : r.charAt(0).toUpperCase() + r.slice(1)}
                  </RecurPill>
                ))}
              </PillRow>

              {form.recurrence === 'weekly' && (
                <>
                  <Label>Repeat on</Label>
                  <DayPillRow>
                    {DAYS.map((d, i) => (
                      <DayPill
                        key={i} type="button"
                        selected={form.recurrence_days.includes(i)}
                        onClick={() => toggleDay(i)}
                      >
                        {d}
                      </DayPill>
                    ))}
                  </DayPillRow>
                </>
              )}

              {form.recurrence === 'monthly' && (
                <>
                  <Label>Day of month</Label>
                  <Input
                    type="number" min={1} max={31}
                    placeholder="e.g. 15"
                    value={form.recurrence_days[0] ?? ''}
                    onChange={e => setForm(f => ({ ...f, recurrence_days: [+e.target.value] }))}
                  />
                </>
              )}

              <ModalActions>
                <CancelBtn type="button" onClick={closeForm}>Cancel</CancelBtn>
                <SubmitBtn type="submit">{editTask ? 'Save Changes' : 'Add Task'}</SubmitBtn>
              </ModalActions>
            </Form>
          </ModalBox>
        </Modal>
      )}
    </Page>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const PRIORITY_COLOR = { high: '#F07050', medium: '#FBBF24', low: '#8C7050' };

const Page = styled.div`padding: 40px 48px; max-width: 900px; @media (max-width: 768px) { padding: 24px 16px; }`;
const PageHeader = styled.div`display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px;`;
const PageTitle = styled.h1`font-family: 'DM Serif Display', serif; font-size: 1.8rem; font-weight: 400; color: #F5ECD8;`;
const PageSub = styled.p`color: #8C7050; font-size: 0.85rem; margin-top: 2px;`;
const AddBtn = styled.button`background: #FBBF24; color: #1C1208; border: none; border-radius: 8px; padding: 10px 18px; font-weight: 600; font-size: 0.88rem; white-space: nowrap; &:hover { opacity: 0.9; }`;

const SummaryCard = styled.div`background: #261A0C; border: 1px solid #3E2A14; border-radius: 12px; padding: 24px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;`;
const SummaryLeft = styled.div``;
const SummaryLabel = styled.p`font-size: 0.75rem; color: #8C7050; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;`;
const SummaryScore = styled.div`font-family: 'DM Serif Display', serif; font-size: 2.2rem; color: #FBBF24; line-height: 1;`;
const SummarySub = styled.p`font-size: 0.82rem; color: #6B5038; margin-top: 4px;`;
const ProgressRing = styled.div<{ pct: number }>`width: 64px; height: 64px; border-radius: 50%; background: conic-gradient(#FBBF24 ${p => p.pct * 3.6}deg, #3E2A14 0deg); display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0; &::before { content: ''; position: absolute; width: 48px; height: 48px; border-radius: 50%; background: #261A0C; }`;
const RingInner = styled.span`font-size: 0.78rem; font-weight: 600; color: #F5ECD8; position: relative; z-index: 1;`;

const FilterRow = styled.div`display: flex; gap: 8px; margin-bottom: 24px;`;
const FilterBtn = styled.button<{ active: boolean }>`display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; border: 1px solid ${p => p.active ? '#FBBF24' : '#3E2A14'}; background: ${p => p.active ? 'rgba(251,191,36,0.12)' : 'transparent'}; color: ${p => p.active ? '#FBBF24' : '#8C7050'}; font-size: 0.82rem; &:hover { border-color: #FBBF24; color: #FBBF24; }`;
const CountPip = styled.span`background: #FBBF24; color: #1C1208; border-radius: 10px; font-size: 0.7rem; font-weight: 700; padding: 1px 6px;`;

const TaskList = styled.div`display: flex; flex-direction: column; gap: 10px;`;
const Empty = styled.p`color: #6B5038; text-align: center; padding: 48px 0;`;

const TaskCard = styled.div<{ done: boolean; priority: Task['priority'] }>`
  background: #261A0C;
  border: 1px solid #3E2A14;
  border-left: 3px solid ${p => p.done ? '#3E2A14' : PRIORITY_COLOR[p.priority]};
  border-radius: 12px;
  padding: 14px 18px;
  opacity: ${p => p.done ? 0.55 : 1};
  transition: opacity 0.2s, border-color 0.2s;
`;

const TaskMain = styled.div`display: flex; align-items: flex-start; gap: 12px;`;

const CheckBtn = styled.button<{ done: boolean; priority: Task['priority'] }>`
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0; margin-top: 1px;
  border: 2px solid ${p => p.done ? '#FBBF24' : PRIORITY_COLOR[p.priority]};
  background: ${p => p.done ? '#FBBF24' : 'transparent'};
  color: #1C1208; font-size: 0.65rem; font-weight: 700;
  transition: all 0.15s;
  &:hover { background: ${p => PRIORITY_COLOR[p.priority]}40; }
`;

const TaskBody = styled.div`flex: 1; min-width: 0;`;
const TaskTop = styled.div`display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 2px;`;
const TaskTitle = styled.span<{ done: boolean }>`font-size: 0.95rem; color: ${p => p.done ? '#6B5038' : '#F5ECD8'}; text-decoration: ${p => p.done ? 'line-through' : 'none'}; font-weight: 500;`;
const TaskDesc = styled.p`font-size: 0.8rem; color: #8C7050; margin-top: 4px; line-height: 1.5;`;

const Badges = styled.div`display: flex; align-items: center; gap: 5px; flex-wrap: wrap;`;
const PriorityBadge = styled.span<{ priority: Task['priority'] }>`font-size: 0.68rem; font-weight: 600; color: ${p => PRIORITY_COLOR[p.priority]}; background: ${p => PRIORITY_COLOR[p.priority]}20; padding: 2px 7px; border-radius: 10px; letter-spacing: 0.02em;`;
const TimeBadge = styled.span`font-size: 0.72rem; color: #C4A870; background: rgba(196,168,112,0.1); padding: 2px 7px; border-radius: 10px;`;
const RecurBadge = styled.span`font-size: 0.72rem; color: #8C7050; background: rgba(140,112,80,0.15); padding: 2px 7px; border-radius: 10px;`;
const SubBadge = styled.span<{ allDone: boolean }>`font-size: 0.72rem; color: ${p => p.allDone ? '#FBBF24' : '#8C7050'}; background: ${p => p.allDone ? 'rgba(251,191,36,0.12)' : 'rgba(140,112,80,0.1)'}; padding: 2px 7px; border-radius: 10px;`;
const OverdueBadge = styled.span`font-size: 0.68rem; font-weight: 600; color: #F07050; background: rgba(240,112,80,0.15); padding: 2px 7px; border-radius: 10px;`;

const SubBar = styled.div`height: 3px; background: #3E2A14; border-radius: 2px; margin-top: 8px; overflow: hidden;`;
const SubBarFill = styled.div`height: 100%; background: linear-gradient(90deg, #FBBF24, #E8A840); border-radius: 2px; transition: width 0.3s;`;

const CardActions = styled.div`display: flex; align-items: center; gap: 4px; flex-shrink: 0;`;
const ExpandBtn = styled.button`background: none; border: none; color: #6B5038; font-size: 0.75rem; padding: 4px 6px; &:hover { color: #FBBF24; }`;
const SmallBtn = styled.button<{ danger?: boolean }>`background: none; border: none; color: ${p => p.danger ? '#6B5038' : '#6B5038'}; font-size: ${p => p.danger ? '1rem' : '0.85rem'}; padding: 4px 5px; &:hover { color: ${p => p.danger ? '#F07050' : '#FBBF24'}; }`;

const SubtaskSection = styled.div`margin-top: 12px; padding-top: 12px; border-top: 1px solid #3E2A14;`;
const SubEmpty = styled.p`font-size: 0.78rem; color: #6B5038; margin-bottom: 8px;`;
const SubtaskRow = styled.div`display: flex; align-items: center; gap: 10px; margin-bottom: 6px;`;
const SubCheck = styled.button<{ checked: boolean }>`width: 16px; height: 16px; border-radius: 4px; flex-shrink: 0; border: 1.5px solid ${p => p.checked ? '#FBBF24' : '#3E2A14'}; background: ${p => p.checked ? '#FBBF24' : 'transparent'}; transition: all 0.15s; &:hover { border-color: #FBBF24; }`;
const SubTitle = styled.span<{ done: boolean }>`flex: 1; font-size: 0.84rem; color: ${p => p.done ? '#6B5038' : '#C4A870'}; text-decoration: ${p => p.done ? 'line-through' : 'none'};`;
const SubDelete = styled.button`background: none; border: none; color: #3E2A14; font-size: 0.75rem; padding: 2px 4px; &:hover { color: #F07050; }`;
const SubtaskInputRow = styled.div`display: flex; gap: 8px; margin-top: 8px;`;
const SubtaskInput = styled.input`flex: 1; background: #1C1208; border: 1px solid #3E2A14; border-radius: 6px; padding: 7px 12px; color: #F5ECD8; font-size: 0.83rem; outline: none; &:focus { border-color: #FBBF24; } &::placeholder { color: #6B5038; }`;
const SubtaskAddBtn = styled.button`background: rgba(251,191,36,0.1); border: 1px solid #FBBF24; border-radius: 6px; color: #FBBF24; width: 30px; font-size: 1rem; &:hover { background: rgba(251,191,36,0.2); }`;

const Modal = styled.div`position: fixed; inset: 0; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px;`;
const ModalBox = styled.div`background: #261A0C; border: 1px solid #3E2A14; border-radius: 16px; padding: 32px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto;`;
const ModalTitle = styled.h2`font-family: 'DM Serif Display', serif; font-size: 1.3rem; font-weight: 400; color: #F5ECD8; margin-bottom: 24px;`;
const Form = styled.form`display: flex; flex-direction: column; gap: 14px;`;
const Label = styled.label`font-size: 0.8rem; color: #C4A870; display: block; margin-bottom: 4px;`;
const Input = styled.input`width: 100%; background: #1C1208; border: 1px solid #3E2A14; border-radius: 8px; padding: 10px 14px; color: #F5ECD8; outline: none; box-sizing: border-box; &:focus { border-color: #FBBF24; } &::placeholder { color: #6B5038; }`;
const Textarea = styled.textarea`width: 100%; background: #1C1208; border: 1px solid #3E2A14; border-radius: 8px; padding: 10px 14px; color: #F5ECD8; outline: none; resize: vertical; box-sizing: border-box; &:focus { border-color: #FBBF24; } &::placeholder { color: #6B5038; }`;
const FormRow = styled.div`display: flex; gap: 12px;`;
const FormField = styled.div`flex: 1;`;

const PillRow = styled.div`display: flex; gap: 8px; flex-wrap: wrap;`;
const PriorityPill = styled.button<{ priority: Task['priority']; selected: boolean }>`
  padding: 6px 16px; border-radius: 20px; font-size: 0.82rem; font-weight: 500;
  border: 1px solid ${p => p.selected ? PRIORITY_COLOR[p.priority] : '#3E2A14'};
  background: ${p => p.selected ? PRIORITY_COLOR[p.priority] + '25' : 'transparent'};
  color: ${p => p.selected ? PRIORITY_COLOR[p.priority] : '#8C7050'};
  &:hover { border-color: ${p => PRIORITY_COLOR[p.priority]}; color: ${p => PRIORITY_COLOR[p.priority]}; }
`;
const RecurPill = styled.button<{ selected: boolean }>`
  padding: 6px 16px; border-radius: 20px; font-size: 0.82rem;
  border: 1px solid ${p => p.selected ? '#FBBF24' : '#3E2A14'};
  background: ${p => p.selected ? 'rgba(251,191,36,0.15)' : 'transparent'};
  color: ${p => p.selected ? '#FBBF24' : '#8C7050'};
  &:hover { border-color: #FBBF24; color: #FBBF24; }
`;
const DayPillRow = styled.div`display: flex; gap: 6px; flex-wrap: wrap;`;
const DayPill = styled.button<{ selected: boolean }>`
  padding: 5px 10px; border-radius: 8px; font-size: 0.78rem;
  border: 1px solid ${p => p.selected ? '#FBBF24' : '#3E2A14'};
  background: ${p => p.selected ? 'rgba(251,191,36,0.15)' : 'transparent'};
  color: ${p => p.selected ? '#FBBF24' : '#8C7050'};
  &:hover { border-color: #FBBF24; color: #FBBF24; }
`;

const ModalActions = styled.div`display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px;`;
const CancelBtn = styled.button`background: none; border: 1px solid #3E2A14; border-radius: 8px; color: #8C7050; padding: 9px 18px; font-size: 0.88rem; &:hover { border-color: #8C7050; }`;
const SubmitBtn = styled.button`background: #FBBF24; color: #1C1208; border: none; border-radius: 8px; padding: 9px 18px; font-weight: 600; font-size: 0.88rem; &:hover { opacity: 0.9; }`;
