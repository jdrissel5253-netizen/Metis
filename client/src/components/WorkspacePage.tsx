import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import api from '../api';

interface TalosTask {
  id: number;
  section_id: number;
  title: string;
  completed: boolean;
}

interface TalosSection {
  id: number;
  title: string;
  color: string;
  tasks: TalosTask[];
}

interface Props {
  workspace: string;
  title: string;
  subtitle: string;
}

const SECTION_COLORS = ['#FBBF24', '#E8A840', '#F09060', '#6BCB8B', '#60A5FA', '#C084FC', '#F07050'];

export default function WorkspacePage({ workspace, title, subtitle }: Props) {
  const [sections, setSections] = useState<TalosSection[]>([]);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSection, setNewSection] = useState({ title: '', color: '#FBBF24' });
  const [newTaskText, setNewTaskText] = useState<Record<number, string>>({});
  const [editingSection, setEditingSection] = useState<TalosSection | null>(null);
  const initDone = useRef(false);

  const fetchSections = async () => {
    const { data } = await api.get(`/talos/sections?workspace=${workspace}`);
    setSections(data);
    if (!initDone.current) {
      setCollapsed(new Set(data.map((s: TalosSection) => s.id)));
      initDone.current = true;
    }
  };

  useEffect(() => {
    initDone.current = false;
    fetchSections();
  }, [workspace]);

  const toggleCollapse = (id: number) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/talos/sections', { ...newSection, workspace });
    setShowAddSection(false);
    setNewSection({ title: '', color: '#FBBF24' });
    fetchSections();
  };

  const handleEditSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    await api.put(`/talos/sections/${editingSection.id}`, { title: editingSection.title, color: editingSection.color });
    setEditingSection(null);
    fetchSections();
  };

  const handleDeleteSection = async (id: number) => {
    if (!confirm('Delete this section and all its tasks?')) return;
    await api.delete(`/talos/sections/${id}`);
    fetchSections();
  };

  const handleAddTask = async (sectionId: number) => {
    const text = newTaskText[sectionId]?.trim();
    if (!text) return;
    await api.post(`/talos/sections/${sectionId}/tasks`, { title: text });
    setNewTaskText(prev => ({ ...prev, [sectionId]: '' }));
    fetchSections();
  };

  const handleToggleTask = async (task: TalosTask) => {
    await api.put(`/talos/tasks/${task.id}`, { completed: !task.completed });
    fetchSections();
  };

  const handleDeleteTask = async (id: number) => {
    await api.delete(`/talos/tasks/${id}`);
    fetchSections();
  };

  const handleClearCompleted = async (sectionId: number) => {
    await api.delete(`/talos/sections/${sectionId}/completed`);
    fetchSections();
  };

  const totalTasks = sections.reduce((s, sec) => s + sec.tasks.length, 0);
  const doneTasks = sections.reduce((s, sec) => s + sec.tasks.filter(t => t.completed).length, 0);

  return (
    <Page>
      <PageHeader>
        <HeaderLeft>
          <PageTitle>{title}</PageTitle>
          <PageSub>{subtitle}</PageSub>
        </HeaderLeft>
        <HeaderRight>
          {totalTasks > 0 && (
            <DayScore>
              <ScoreNum>{doneTasks}/{totalTasks}</ScoreNum>
              <ScoreLabel>done</ScoreLabel>
            </DayScore>
          )}
          <AddSectionBtn onClick={() => setShowAddSection(true)}>+ New Section</AddSectionBtn>
        </HeaderRight>
      </PageHeader>

      {totalTasks > 0 && (
        <ProgressBanner>
          <ProgressTrack>
            <ProgressFill style={{ width: `${(doneTasks / totalTasks) * 100}%` }} />
          </ProgressTrack>
          <ProgressPct>{Math.round((doneTasks / totalTasks) * 100)}% complete</ProgressPct>
        </ProgressBanner>
      )}

      {sections.length === 0 && (
        <EmptyState>
          <EmptyTitle>Set up your {title} workspace</EmptyTitle>
          <EmptyDesc>Add sections to organize your tasks and keep everything in one place.</EmptyDesc>
          <AddSectionBtn onClick={() => setShowAddSection(true)}>+ Add your first section</AddSectionBtn>
        </EmptyState>
      )}

      <TwoColumnGrid>
        {[
          sections.slice(0, Math.ceil(sections.length / 2)),
          sections.slice(Math.ceil(sections.length / 2)),
        ].map((columnSections, colIdx) => (
          <SectionList key={colIdx}>
            {columnSections
              .map(section => {
                const isCollapsed = collapsed.has(section.id);
                const completedCount = section.tasks.filter(t => t.completed).length;
                const pendingTasks = section.tasks.filter(t => !t.completed);
                const completedTasks = section.tasks.filter(t => t.completed);

                return (
                  <SectionCard key={section.id} color={section.color}>
                    <SectionHeader onClick={() => toggleCollapse(section.id)}>
                      <SectionLeft>
                        <CollapseArrow>{isCollapsed ? '▸' : '▾'}</CollapseArrow>
                        <ColorDot color={section.color} />
                        <SectionTitle>{section.title}</SectionTitle>
                        <TaskCount>
                          {section.tasks.length} task{section.tasks.length !== 1 ? 's' : ''}
                          {completedCount > 0 ? ` · ${completedCount} done` : ''}
                        </TaskCount>
                      </SectionLeft>
                      <SectionActions onClick={e => e.stopPropagation()}>
                        {completedCount > 0 && (
                          <ClearBtn onClick={() => handleClearCompleted(section.id)}>Clear done</ClearBtn>
                        )}
                        <IconBtn onClick={() => setEditingSection({ ...section })}>✎</IconBtn>
                        <IconBtn danger onClick={() => handleDeleteSection(section.id)}>✕</IconBtn>
                      </SectionActions>
                    </SectionHeader>

                    {!isCollapsed && (
                      <SectionBody>
                        <TaskList>
                          {pendingTasks.map(task => (
                            <TaskRow key={task.id}>
                              <TaskCheck checked={false} onClick={() => handleToggleTask(task)} />
                              <TaskTitle done={false}>{task.title}</TaskTitle>
                              <TaskDel onClick={() => handleDeleteTask(task.id)}>✕</TaskDel>
                            </TaskRow>
                          ))}
                          {completedTasks.map(task => (
                            <TaskRow key={task.id} faded>
                              <TaskCheck checked color={section.color} onClick={() => handleToggleTask(task)} />
                              <TaskTitle done>{task.title}</TaskTitle>
                              <TaskDel onClick={() => handleDeleteTask(task.id)}>✕</TaskDel>
                            </TaskRow>
                          ))}
                        </TaskList>

                        <TaskInputRow>
                          <TaskInput
                            placeholder="Add a task... (Enter to save)"
                            value={newTaskText[section.id] || ''}
                            onChange={e => setNewTaskText(prev => ({ ...prev, [section.id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && handleAddTask(section.id)}
                          />
                          <TaskAddBtn color={section.color} onClick={() => handleAddTask(section.id)}>+</TaskAddBtn>
                        </TaskInputRow>
                      </SectionBody>
                    )}
                  </SectionCard>
                );
              })}
          </SectionList>
        ))}
      </TwoColumnGrid>

      {showAddSection && (
        <Modal onClick={() => setShowAddSection(false)}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalTitle>New Section</ModalTitle>
            <Form onSubmit={handleAddSection}>
              <Label>Section Name</Label>
              <Input placeholder="e.g. Research, Writing, Editing" value={newSection.title} onChange={e => setNewSection(f => ({ ...f, title: e.target.value }))} required autoFocus />
              <Label>Color</Label>
              <ColorRow>
                {SECTION_COLORS.map(c => (
                  <ColorSwatch key={c} color={c} selected={newSection.color === c} onClick={() => setNewSection(f => ({ ...f, color: c }))} type="button" />
                ))}
              </ColorRow>
              <ModalActions>
                <CancelBtn type="button" onClick={() => setShowAddSection(false)}>Cancel</CancelBtn>
                <SubmitBtn type="submit">Create</SubmitBtn>
              </ModalActions>
            </Form>
          </ModalBox>
        </Modal>
      )}

      {editingSection && (
        <Modal onClick={() => setEditingSection(null)}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalTitle>Edit Section</ModalTitle>
            <Form onSubmit={handleEditSection}>
              <Label>Section Name</Label>
              <Input value={editingSection.title} onChange={e => setEditingSection(s => s ? { ...s, title: e.target.value } : s)} required autoFocus />
              <Label>Color</Label>
              <ColorRow>
                {SECTION_COLORS.map(c => (
                  <ColorSwatch key={c} color={c} selected={editingSection.color === c} onClick={() => setEditingSection(s => s ? { ...s, color: c } : s)} type="button" />
                ))}
              </ColorRow>
              <ModalActions>
                <CancelBtn type="button" onClick={() => setEditingSection(null)}>Cancel</CancelBtn>
                <SubmitBtn type="submit">Save</SubmitBtn>
              </ModalActions>
            </Form>
          </ModalBox>
        </Modal>
      )}
    </Page>
  );
}

// ── Styles ──
const Page = styled.div`padding: 40px 48px; max-width: 1400px; @media (max-width: 768px) { padding: 24px 16px; }`;
const PageHeader = styled.div`display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 16px;`;
const HeaderLeft = styled.div``;
const HeaderRight = styled.div`display: flex; align-items: center; gap: 16px;`;
const PageTitle = styled.h1`font-family: 'DM Serif Display', serif; font-size: 1.8rem; font-weight: 400; color: #F5ECD8;`;
const PageSub = styled.p`color: #8C7050; font-size: 0.85rem; margin-top: 2px;`;
const DayScore = styled.div`text-align: center;`;
const ScoreNum = styled.div`font-family: 'DM Serif Display', serif; font-size: 1.4rem; color: #FBBF24; line-height: 1;`;
const ScoreLabel = styled.div`font-size: 0.7rem; color: #6B5038; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;`;
const AddSectionBtn = styled.button`background: #FBBF24; color: #1C1208; border: none; border-radius: 8px; padding: 10px 18px; font-weight: 600; font-size: 0.88rem; white-space: nowrap; &:hover { opacity: 0.9; }`;
const ProgressBanner = styled.div`display: flex; align-items: center; gap: 12px; margin-bottom: 28px;`;
const ProgressTrack = styled.div`flex: 1; height: 6px; background: #3E2A14; border-radius: 4px; overflow: hidden;`;
const ProgressFill = styled.div`height: 100%; background: linear-gradient(90deg, #FBBF24, #E8A840); border-radius: 4px; transition: width 0.4s ease;`;
const ProgressPct = styled.span`font-size: 0.78rem; color: #8C7050; white-space: nowrap; min-width: 80px; text-align: right;`;
const EmptyState = styled.div`text-align: center; padding: 80px 40px;`;
const EmptyTitle = styled.h2`font-family: 'DM Serif Display', serif; font-size: 1.4rem; font-weight: 400; color: #F5ECD8; margin-bottom: 10px;`;
const EmptyDesc = styled.p`font-size: 0.88rem; color: #6B5038; line-height: 1.6; margin-bottom: 24px; max-width: 420px; margin-left: auto; margin-right: auto;`;
const TwoColumnGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: start;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;
const SectionList = styled.div`display: flex; flex-direction: column; gap: 12px;`;
const SectionCard = styled.div<{ color: string }>`background: #261A0C; border: 1px solid #3E2A14; border-radius: 14px; border-left: 3px solid ${p => p.color}; overflow: hidden;`;
const SectionHeader = styled.div`display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px; cursor: pointer; &:hover { background: rgba(255,255,255,0.02); }`;
const SectionLeft = styled.div`display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;`;
const CollapseArrow = styled.span`color: #6B5038; font-size: 0.75rem; flex-shrink: 0;`;
const ColorDot = styled.div<{ color: string }>`width: 8px; height: 8px; border-radius: 50%; background: ${p => p.color}; flex-shrink: 0;`;
const SectionTitle = styled.h2`font-size: 1rem; font-weight: 600; color: #F5ECD8;`;
const TaskCount = styled.span`font-size: 0.75rem; color: #6B5038;`;
const SectionActions = styled.div`display: flex; align-items: center; gap: 8px; flex-shrink: 0;`;
const ClearBtn = styled.button`background: none; border: none; font-size: 0.72rem; color: #6B5038; text-decoration: underline; text-underline-offset: 2px; padding: 0; &:hover { color: #C4A870; }`;
const IconBtn = styled.button<{ danger?: boolean }>`background: none; border: none; color: ${p => p.danger ? '#F07050' : '#6B5038'}; font-size: 0.85rem; padding: 4px 6px; &:hover { opacity: 0.8; }`;
const SectionBody = styled.div`padding: 0 20px 16px; border-top: 1px solid #3E2A14;`;
const TaskList = styled.div`display: flex; flex-direction: column; gap: 2px; padding-top: 12px; margin-bottom: 12px;`;
const TaskRow = styled.div<{ faded?: boolean }>`display: flex; align-items: center; gap: 10px; padding: 7px 4px; border-radius: 6px; opacity: ${p => p.faded ? 0.5 : 1}; &:hover { background: rgba(255,255,255,0.02); }`;
const TaskCheck = styled.button<{ checked: boolean; color?: string }>`
  width: 18px; height: 18px; border-radius: 5px; flex-shrink: 0;
  border: 1.5px solid ${p => p.checked ? (p.color || '#FBBF24') : '#3E2A14'};
  background: ${p => p.checked ? (p.color || '#FBBF24') : 'transparent'};
  transition: all 0.15s; display: flex; align-items: center; justify-content: center;
  font-size: 0.6rem; color: #1C1208; font-weight: 700;
  &:hover { border-color: ${p => p.color || '#FBBF24'}; }
  &::after { content: ${p => p.checked ? '"✓"' : '""'}; }
`;
const TaskTitle = styled.span<{ done: boolean }>`flex: 1; font-size: 0.88rem; color: ${p => p.done ? '#6B5038' : '#C4A870'}; text-decoration: ${p => p.done ? 'line-through' : 'none'};`;
const TaskDel = styled.button`background: none; border: none; color: transparent; font-size: 0.65rem; padding: 2px 4px; ${TaskRow}:hover & { color: #3E2A14; } &:hover { color: #F07050 !important; }`;
const TaskInputRow = styled.div`display: flex; gap: 8px;`;
const TaskInput = styled.input`flex: 1; background: #1C1208; border: 1px solid #3E2A14; border-radius: 6px; padding: 8px 12px; color: #F5ECD8; font-size: 0.85rem; outline: none; &:focus { border-color: #FBBF24; } &::placeholder { color: #4A3520; }`;
const TaskAddBtn = styled.button<{ color: string }>`background: ${p => p.color}20; border: 1px solid ${p => p.color}; border-radius: 6px; color: ${p => p.color}; width: 34px; font-size: 1.1rem; &:hover { background: ${p => p.color}40; }`;
const Modal = styled.div`position: fixed; inset: 0; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px;`;
const ModalBox = styled.div`background: #261A0C; border: 1px solid #3E2A14; border-radius: 16px; padding: 32px; width: 100%; max-width: 420px;`;
const ModalTitle = styled.h2`font-family: 'DM Serif Display', serif; font-size: 1.3rem; font-weight: 400; color: #F5ECD8; margin-bottom: 20px;`;
const Form = styled.form`display: flex; flex-direction: column; gap: 14px;`;
const Label = styled.label`font-size: 0.8rem; color: #C4A870; display: block; margin-bottom: 4px;`;
const Input = styled.input`width: 100%; background: #1C1208; border: 1px solid #3E2A14; border-radius: 8px; padding: 10px 14px; color: #F5ECD8; outline: none; &:focus { border-color: #FBBF24; } &::placeholder { color: #6B5038; }`;
const ColorRow = styled.div`display: flex; gap: 8px; flex-wrap: wrap;`;
const ColorSwatch = styled.button<{ color: string; selected: boolean }>`width: 26px; height: 26px; border-radius: 50%; background: ${p => p.color}; border: 2px solid ${p => p.selected ? '#F5ECD8' : 'transparent'}; padding: 0; transition: border-color 0.15s;`;
const ModalActions = styled.div`display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px;`;
const CancelBtn = styled.button`background: none; border: 1px solid #3E2A14; border-radius: 8px; color: #8C7050; padding: 9px 18px; font-size: 0.88rem; &:hover { border-color: #8C7050; }`;
const SubmitBtn = styled.button`background: #FBBF24; color: #1C1208; border: none; border-radius: 8px; padding: 9px 18px; font-weight: 600; font-size: 0.88rem; &:hover { opacity: 0.9; }`;
