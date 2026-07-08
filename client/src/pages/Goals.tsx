import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { format } from 'date-fns';
import api from '../api';

interface Goal {
  id: number;
  title: string;
  description: string;
  category: string;
  target_date: string | null;
  progress: number;
  status: 'active' | 'completed' | 'paused';
  parent_id: number | null;
  created_at: string;
}

interface Task {
  id: number;
  goal_id: number;
  title: string;
  completed: boolean;
}

const CATEGORIES = ['Health', 'Finance', 'Career', 'Learning', 'Relationships', 'Family', 'Personal', 'Other'];

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Record<number, Task[]>>({});
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [updateTarget, setUpdateTarget] = useState<Goal | null>(null);
  const [updateNote, setUpdateNote] = useState('');
  const [updateProgress, setUpdateProgress] = useState(0);
  const [newTaskText, setNewTaskText] = useState<Record<number, string>>({});
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'paused'>('active');
  const [form, setForm] = useState({
    title: '', description: '', category: '', target_date: '', progress: 0, parent_id: '' as string | number
  });

  const fetchGoals = async () => {
    const { data } = await api.get('/goals');
    setGoals(data);
    // fetch tasks for all goals
    const taskMap: Record<number, Task[]> = {};
    await Promise.all(data.map(async (g: Goal) => {
      const res = await api.get(`/goals/${g.id}/tasks`);
      taskMap[g.id] = res.data;
    }));
    setTasks(taskMap);
  };

  useEffect(() => { fetchGoals(); }, []);

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, parent_id: form.parent_id || null };
    if (editGoal) {
      await api.put(`/goals/${editGoal.id}`, payload);
    } else {
      await api.post('/goals', payload);
    }
    closeForm();
    fetchGoals();
  };

  const closeForm = () => {
    setShowForm(false);
    setEditGoal(null);
    setForm({ title: '', description: '', category: '', target_date: '', progress: 0, parent_id: '' });
  };

  const handleEdit = (g: Goal) => {
    setEditGoal(g);
    setForm({
      title: g.title,
      description: g.description || '',
      category: g.category || '',
      target_date: g.target_date?.split('T')[0] || '',
      progress: g.progress,
      parent_id: g.parent_id || '',
    });
    setShowForm(true);
  };

  const handleStatusChange = async (g: Goal, status: string) => {
    await api.put(`/goals/${g.id}`, { status });
    fetchGoals();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this goal?')) return;
    await api.delete(`/goals/${id}`);
    fetchGoals();
  };

  const handleLogUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateTarget) return;
    await api.post(`/goals/${updateTarget.id}/updates`, { note: updateNote, progress_value: updateProgress });
    setUpdateTarget(null);
    setUpdateNote('');
    fetchGoals();
  };

  const handleAddTask = async (goalId: number) => {
    const text = newTaskText[goalId]?.trim();
    if (!text) return;
    await api.post(`/goals/${goalId}/tasks`, { title: text });
    setNewTaskText(prev => ({ ...prev, [goalId]: '' }));
    fetchGoals();
  };

  const handleToggleTask = async (task: Task) => {
    await api.put(`/goals/tasks/${task.id}`, { completed: !task.completed });
    fetchGoals();
  };

  const handleDeleteTask = async (task: Task) => {
    await api.delete(`/goals/tasks/${task.id}`);
    fetchGoals();
  };

  const childAvgProgress = (parentId: number) => {
    const children = goals.filter(g => g.parent_id === parentId && g.status === 'active');
    if (!children.length) return null;
    return Math.round(children.reduce((s, g) => s + g.progress, 0) / children.length);
  };

  const topLevel = goals.filter(g => !g.parent_id);
  const filtered = filter === 'all' ? topLevel : topLevel.filter(g => g.status === filter);
  const parentGoals = goals.filter(g => !g.parent_id);

  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>Goals</PageTitle>
          <PageSub>Long-term destinations and the milestones that get you there</PageSub>
        </div>
        <AddBtn onClick={() => { closeForm(); setShowForm(true); }}>+ New Goal</AddBtn>
      </PageHeader>

      <FilterRow>
        {(['active', 'all', 'completed', 'paused'] as const).map(f => (
          <FilterBtn key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </FilterBtn>
        ))}
      </FilterRow>

      {filtered.length === 0 && <Empty>No {filter !== 'all' ? filter : ''} goals yet.</Empty>}

      <GoalList>
        {filtered.map(parent => {
          const children = goals.filter(g => g.parent_id === parent.id);
          const filteredChildren = filter === 'all' ? children : children.filter(g => g.status === filter);
          const childProgress = childAvgProgress(parent.id);
          const displayProgress = childProgress !== null ? childProgress : parent.progress;
          const parentTasks = tasks[parent.id] || [];
          const isOpen = expanded.has(parent.id);

          return (
            <ParentCard key={parent.id} status={parent.status}>
              <ParentTop>
                <ParentMeta>
                  <CategoryTag>{parent.category || 'Goal'}</CategoryTag>
                  <StatusBadge status={parent.status}>{parent.status}</StatusBadge>
                  {children.length > 0 && (
                    <MilestoneBadge>{children.length} milestone{children.length !== 1 ? 's' : ''}</MilestoneBadge>
                  )}
                </ParentMeta>
                <ParentActions>
                  <SmallBtn onClick={() => { setUpdateTarget(parent); setUpdateProgress(parent.progress); }}>Update</SmallBtn>
                  <SmallBtn onClick={() => handleEdit(parent)}>Edit</SmallBtn>
                  {parent.status === 'active'
                    ? <SmallBtn accent onClick={() => handleStatusChange(parent, 'completed')}>Complete</SmallBtn>
                    : <SmallBtn onClick={() => handleStatusChange(parent, 'active')}>Reopen</SmallBtn>
                  }
                  <SmallBtn danger onClick={() => handleDelete(parent.id)}>✕</SmallBtn>
                </ParentActions>
              </ParentTop>

              <ParentTitle>{parent.title}</ParentTitle>
              {parent.description && <ParentDesc>{parent.description}</ParentDesc>}

              <ProgressRow>
                <ProgressBar>
                  <ProgressFill style={{ width: `${displayProgress}%` }} />
                </ProgressBar>
                <ProgressPct>{displayProgress}%</ProgressPct>
                {childProgress !== null && <ProgressNote>avg of milestones</ProgressNote>}
              </ProgressRow>

              {parent.target_date && (
                <DueDate>Target: {format(new Date(parent.target_date), 'MMM d, yyyy')}</DueDate>
              )}

              {/* Tasks */}
              <TaskSection>
                <TaskList>
                  {parentTasks.map(task => (
                    <TaskRow key={task.id}>
                      <TaskCheck checked={task.completed} onClick={() => handleToggleTask(task)} />
                      <TaskTitle done={task.completed}>{task.title}</TaskTitle>
                      <TaskDelete onClick={() => handleDeleteTask(task)}>✕</TaskDelete>
                    </TaskRow>
                  ))}
                </TaskList>
                <TaskInputRow>
                  <TaskInput
                    placeholder="Add a task..."
                    value={newTaskText[parent.id] || ''}
                    onChange={e => setNewTaskText(prev => ({ ...prev, [parent.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleAddTask(parent.id)}
                  />
                  <TaskAddBtn onClick={() => handleAddTask(parent.id)}>+</TaskAddBtn>
                </TaskInputRow>
              </TaskSection>

              {/* Milestones */}
              {children.length > 0 && (
                <>
                  <MilestoneToggle onClick={() => toggleExpand(parent.id)}>
                    <span>{isOpen ? '▾' : '▸'} Milestones ({children.length})</span>
                    {!isOpen && <MilestonePreview>{children.slice(0, 2).map(c => c.title).join(' · ')}{children.length > 2 ? '...' : ''}</MilestonePreview>}
                  </MilestoneToggle>

                  {isOpen && (
                    <MilestoneList>
                      {filteredChildren.map(child => {
                        const childTasks = tasks[child.id] || [];
                        return (
                          <MilestoneCard key={child.id} status={child.status}>
                            <MilestoneMeta>
                              <CategoryTag>{child.category || 'Milestone'}</CategoryTag>
                              <StatusBadge status={child.status}>{child.status}</StatusBadge>
                            </MilestoneMeta>
                            <MilestoneHeader>
                              <MilestoneTitle>{child.title}</MilestoneTitle>
                              <MilestoneActions>
                                <SmallBtn onClick={() => { setUpdateTarget(child); setUpdateProgress(child.progress); }}>Update</SmallBtn>
                                <SmallBtn onClick={() => handleEdit(child)}>Edit</SmallBtn>
                                {child.status === 'active'
                                  ? <SmallBtn accent onClick={() => handleStatusChange(child, 'completed')}>Complete</SmallBtn>
                                  : <SmallBtn onClick={() => handleStatusChange(child, 'active')}>Reopen</SmallBtn>
                                }
                                <SmallBtn danger onClick={() => handleDelete(child.id)}>✕</SmallBtn>
                              </MilestoneActions>
                            </MilestoneHeader>
                            {child.description && <MilestoneDesc>{child.description}</MilestoneDesc>}
                            <ProgressRow>
                              <ProgressBar>
                                <ProgressFill style={{ width: `${child.progress}%` }} />
                              </ProgressBar>
                              <ProgressPct>{child.progress}%</ProgressPct>
                            </ProgressRow>
                            {child.target_date && <DueDate>Target: {format(new Date(child.target_date), 'MMM d, yyyy')}</DueDate>}

                            <TaskSection>
                              <TaskList>
                                {childTasks.map(task => (
                                  <TaskRow key={task.id}>
                                    <TaskCheck checked={task.completed} onClick={() => handleToggleTask(task)} />
                                    <TaskTitle done={task.completed}>{task.title}</TaskTitle>
                                    <TaskDelete onClick={() => handleDeleteTask(task)}>✕</TaskDelete>
                                  </TaskRow>
                                ))}
                              </TaskList>
                              <TaskInputRow>
                                <TaskInput
                                  placeholder="Add a task..."
                                  value={newTaskText[child.id] || ''}
                                  onChange={e => setNewTaskText(prev => ({ ...prev, [child.id]: e.target.value }))}
                                  onKeyDown={e => e.key === 'Enter' && handleAddTask(child.id)}
                                />
                                <TaskAddBtn onClick={() => handleAddTask(child.id)}>+</TaskAddBtn>
                              </TaskInputRow>
                            </TaskSection>
                          </MilestoneCard>
                        );
                      })}
                      <AddMilestoneBtn onClick={() => {
                        setForm({ title: '', description: '', category: parent.category || '', target_date: '', progress: 0, parent_id: parent.id });
                        setShowForm(true);
                      }}>
                        + Add milestone to this goal
                      </AddMilestoneBtn>
                    </MilestoneList>
                  )}
                </>
              )}

              {children.length === 0 && (
                <AddMilestoneBtn onClick={() => {
                  setForm({ title: '', description: '', category: parent.category || '', target_date: '', progress: 0, parent_id: parent.id });
                  setShowForm(true);
                }}>
                  + Add a milestone
                </AddMilestoneBtn>
              )}
            </ParentCard>
          );
        })}
      </GoalList>

      {/* New / Edit Goal Modal */}
      {showForm && (
        <Modal onClick={closeForm}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalTitle>{editGoal ? 'Edit Goal' : form.parent_id ? 'New Milestone' : 'New Goal'}</ModalTitle>
            <Form onSubmit={handleSubmit}>
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder={form.parent_id ? 'What milestone do you want to hit?' : 'What do you want to achieve?'} />
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional details..." rows={3} />
              <FormRow>
                <div style={{ flex: 1 }}>
                  <Label>Category</Label>
                  <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </div>
                <div style={{ flex: 1 }}>
                  <Label>Target Date</Label>
                  <Input type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
                </div>
              </FormRow>
              <Label>Link to long-term goal (optional)</Label>
              <Select value={String(form.parent_id)} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}>
                <option value="">None — this is a top-level goal</option>
                {parentGoals.filter(g => !editGoal || g.id !== editGoal.id).map(g => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </Select>
              <Label>Progress: {form.progress}%</Label>
              <input type="range" min={0} max={100} value={form.progress} onChange={e => setForm(f => ({ ...f, progress: +e.target.value }))} style={{ width: '100%', accentColor: '#FBBF24' }} />
              <ModalActions>
                <CancelBtn type="button" onClick={closeForm}>Cancel</CancelBtn>
                <SubmitBtn type="submit">{editGoal ? 'Save Changes' : 'Create'}</SubmitBtn>
              </ModalActions>
            </Form>
          </ModalBox>
        </Modal>
      )}

      {/* Update Progress Modal */}
      {updateTarget && (
        <Modal onClick={() => setUpdateTarget(null)}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalTitle>Log Update</ModalTitle>
            <UpdateGoalName>{updateTarget.title}</UpdateGoalName>
            <Form onSubmit={handleLogUpdate}>
              <Label>New Progress: {updateProgress}%</Label>
              <input type="range" min={0} max={100} value={updateProgress} onChange={e => setUpdateProgress(+e.target.value)} style={{ width: '100%', accentColor: '#FBBF24' }} />
              <Label>Note (optional)</Label>
              <Textarea value={updateNote} onChange={e => setUpdateNote(e.target.value)} placeholder="What did you accomplish?" rows={3} />
              <ModalActions>
                <CancelBtn type="button" onClick={() => setUpdateTarget(null)}>Cancel</CancelBtn>
                <SubmitBtn type="submit">Save Update</SubmitBtn>
              </ModalActions>
            </Form>
          </ModalBox>
        </Modal>
      )}
    </Page>
  );
}

// Styles
const Page = styled.div`padding: 40px 48px; max-width: 900px; @media (max-width: 768px) { padding: 24px 16px; }`;
const PageHeader = styled.div`display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px;`;
const PageTitle = styled.h1`font-family: 'DM Serif Display', serif; font-size: 1.8rem; font-weight: 400; color: #F5ECD8;`;
const PageSub = styled.p`color: #8C7050; font-size: 0.85rem; margin-top: 2px;`;
const AddBtn = styled.button`background: #FBBF24; color: #1C1208; border: none; border-radius: 8px; padding: 10px 18px; font-weight: 600; font-size: 0.88rem; white-space: nowrap; &:hover { opacity: 0.9; }`;
const FilterRow = styled.div`display: flex; gap: 8px; margin-bottom: 28px;`;
const FilterBtn = styled.button<{ active: boolean }>`padding: 6px 14px; border-radius: 20px; border: 1px solid ${p => p.active ? '#FBBF24' : '#3E2A14'}; background: ${p => p.active ? 'rgba(251,191,36,0.12)' : 'transparent'}; color: ${p => p.active ? '#FBBF24' : '#8C7050'}; font-size: 0.82rem; &:hover { border-color: #FBBF24; color: #FBBF24; }`;
const Empty = styled.p`color: #6B5038; text-align: center; padding: 64px 0;`;
const GoalList = styled.div`display: flex; flex-direction: column; gap: 24px;`;

const ParentCard = styled.div<{ status: string }>`
  background: #261A0C;
  border: 1px solid #3E2A14;
  border-radius: 16px;
  padding: 24px;
  opacity: ${p => p.status === 'paused' ? 0.6 : 1};
  border-left: 3px solid #FBBF24;
`;

const ParentTop = styled.div`display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 12px;`;
const ParentMeta = styled.div`display: flex; align-items: center; gap: 8px; flex-wrap: wrap;`;
const ParentActions = styled.div`display: flex; gap: 6px; flex-shrink: 0;`;
const ParentTitle = styled.h2`font-family: 'DM Serif Display', serif; font-size: 1.25rem; font-weight: 400; color: #F5ECD8; margin-bottom: 6px;`;
const ParentDesc = styled.p`font-size: 0.85rem; color: #8C7050; line-height: 1.6; margin-bottom: 16px;`;

const CategoryTag = styled.span`font-size: 0.7rem; color: #8C7050; text-transform: uppercase; letter-spacing: 0.05em; background: #1C1208; padding: 2px 8px; border-radius: 10px;`;
const StatusBadge = styled.span<{ status: string }>`font-size: 0.7rem; padding: 2px 8px; border-radius: 10px; background: ${p => p.status === 'completed' ? 'rgba(251,191,36,0.12)' : p.status === 'paused' ? 'rgba(140,112,80,0.1)' : 'rgba(232,168,64,0.1)'}; color: ${p => p.status === 'completed' ? '#FBBF24' : p.status === 'paused' ? '#8C7050' : '#E8A840'};`;
const MilestoneBadge = styled.span`font-size: 0.7rem; color: #C4A870; background: rgba(196,168,112,0.1); padding: 2px 8px; border-radius: 10px;`;

const SmallBtn = styled.button<{ accent?: boolean; danger?: boolean }>`
  padding: 4px 10px; border-radius: 6px; font-size: 0.72rem;
  border: 1px solid ${p => p.danger ? '#F07050' : p.accent ? '#FBBF24' : '#3E2A14'};
  background: ${p => p.accent ? 'rgba(251,191,36,0.1)' : 'transparent'};
  color: ${p => p.danger ? '#F07050' : p.accent ? '#FBBF24' : '#8C7050'};
  &:hover { opacity: 0.8; }
`;

const ProgressRow = styled.div`display: flex; align-items: center; gap: 10px; margin: 12px 0 8px;`;
const ProgressBar = styled.div`flex: 1; height: 5px; background: #3E2A14; border-radius: 3px; overflow: hidden;`;
const ProgressFill = styled.div`height: 100%; background: linear-gradient(90deg, #FBBF24, #E8A840); border-radius: 3px; transition: width 0.4s ease;`;
const ProgressPct = styled.span`font-size: 0.8rem; font-weight: 600; color: #FBBF24; min-width: 36px;`;
const ProgressNote = styled.span`font-size: 0.7rem; color: #6B5038; font-style: italic;`;
const DueDate = styled.p`font-size: 0.75rem; color: #6B5038; margin-bottom: 12px;`;

const TaskSection = styled.div`margin-top: 16px; border-top: 1px solid #3E2A14; padding-top: 14px;`;
const TaskList = styled.div`display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px;`;
const TaskRow = styled.div`display: flex; align-items: center; gap: 10px;`;
const TaskCheck = styled.button<{ checked: boolean }>`
  width: 16px; height: 16px; border-radius: 4px; flex-shrink: 0;
  border: 1.5px solid ${p => p.checked ? '#FBBF24' : '#3E2A14'};
  background: ${p => p.checked ? '#FBBF24' : 'transparent'};
  transition: all 0.15s;
  &:hover { border-color: #FBBF24; }
`;
const TaskTitle = styled.span<{ done: boolean }>`flex: 1; font-size: 0.85rem; color: ${p => p.done ? '#6B5038' : '#C4A870'}; text-decoration: ${p => p.done ? 'line-through' : 'none'};`;
const TaskDelete = styled.button`background: none; border: none; color: #3E2A14; font-size: 0.7rem; padding: 2px; &:hover { color: #F07050; }`;
const TaskInputRow = styled.div`display: flex; gap: 8px;`;
const TaskInput = styled.input`flex: 1; background: #1C1208; border: 1px solid #3E2A14; border-radius: 6px; padding: 7px 12px; color: #F5ECD8; font-size: 0.83rem; outline: none; &:focus { border-color: #FBBF24; } &::placeholder { color: #6B5038; }`;
const TaskAddBtn = styled.button`background: rgba(251,191,36,0.1); border: 1px solid #FBBF24; border-radius: 6px; color: #FBBF24; width: 30px; font-size: 1rem; &:hover { background: rgba(251,191,36,0.2); }`;

const MilestoneToggle = styled.button`
  display: flex; align-items: center; gap: 12px; background: none; border: none;
  color: #C4A870; font-size: 0.82rem; margin-top: 16px; padding: 0; width: 100%;
  &:hover { color: #FBBF24; }
`;
const MilestonePreview = styled.span`color: #6B5038; font-size: 0.75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
const MilestoneList = styled.div`margin-top: 12px; display: flex; flex-direction: column; gap: 12px;`;

const MilestoneCard = styled.div<{ status: string }>`
  background: #1C1208;
  border: 1px solid #3E2A14;
  border-radius: 12px;
  padding: 16px 18px;
  opacity: ${p => p.status === 'paused' ? 0.6 : 1};
  border-left: 2px solid #E8A840;
`;
const MilestoneMeta = styled.div`display: flex; align-items: center; gap: 8px; margin-bottom: 8px;`;
const MilestoneHeader = styled.div`display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 4px;`;
const MilestoneTitle = styled.h3`font-size: 0.95rem; font-weight: 600; color: #F5ECD8;`;
const MilestoneActions = styled.div`display: flex; gap: 5px; flex-shrink: 0;`;
const MilestoneDesc = styled.p`font-size: 0.8rem; color: #8C7050; margin-bottom: 8px; line-height: 1.5;`;

const AddMilestoneBtn = styled.button`
  margin-top: 14px; background: none; border: 1px dashed #3E2A14; border-radius: 8px;
  color: #6B5038; font-size: 0.82rem; padding: 10px; width: 100%;
  &:hover { border-color: #FBBF24; color: #FBBF24; }
`;

const Modal = styled.div`position: fixed; inset: 0; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px;`;
const ModalBox = styled.div`background: #261A0C; border: 1px solid #3E2A14; border-radius: 16px; padding: 32px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto;`;
const ModalTitle = styled.h2`font-family: 'DM Serif Display', serif; font-size: 1.3rem; font-weight: 400; color: #F5ECD8; margin-bottom: 6px;`;
const UpdateGoalName = styled.p`font-size: 0.85rem; color: #8C7050; margin-bottom: 20px;`;
const Form = styled.form`display: flex; flex-direction: column; gap: 14px;`;
const Label = styled.label`font-size: 0.8rem; color: #C4A870; display: block; margin-bottom: 4px;`;
const Input = styled.input`width: 100%; background: #1C1208; border: 1px solid #3E2A14; border-radius: 8px; padding: 10px 14px; color: #F5ECD8; outline: none; &:focus { border-color: #FBBF24; } &::placeholder { color: #6B5038; }`;
const Textarea = styled.textarea`width: 100%; background: #1C1208; border: 1px solid #3E2A14; border-radius: 8px; padding: 10px 14px; color: #F5ECD8; outline: none; resize: vertical; &:focus { border-color: #FBBF24; } &::placeholder { color: #6B5038; }`;
const Select = styled.select`width: 100%; background: #1C1208; border: 1px solid #3E2A14; border-radius: 8px; padding: 10px 14px; color: #F5ECD8; outline: none; &:focus { border-color: #FBBF24; }`;
const FormRow = styled.div`display: flex; gap: 12px;`;
const ModalActions = styled.div`display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px;`;
const CancelBtn = styled.button`background: none; border: 1px solid #3E2A14; border-radius: 8px; color: #8C7050; padding: 9px 18px; font-size: 0.88rem; &:hover { border-color: #8C7050; }`;
const SubmitBtn = styled.button`background: #FBBF24; color: #1C1208; border: none; border-radius: 8px; padding: 9px 18px; font-weight: 600; font-size: 0.88rem; &:hover { opacity: 0.9; }`;
