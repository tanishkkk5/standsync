// src/lib/team.js
// Real team for Supa Daily Standup · xtransmatrix.com

export const TEAM = [
  {
    id: 'tanisk',
    name: 'Tanisk Pandey',
    email: 'tanisk.pandey@xtransmatrix.com',
    initials: 'TP',
    role: 'Manager',
    color: '#818CF8',
    isManager: true,
  },
  {
    id: 'deepak',
    name: 'Deepak NR',
    email: 'deepak.nr@xtransmatrix.com',
    initials: 'DN',
    role: 'Team Member',
    color: '#38BDF8',
    isManager: false,
  },
  {
    id: 'madhan',
    name: 'Madhan M',
    email: 'madhan.m@xtransmatrix.com',
    initials: 'MM',
    role: 'Team Member',
    color: '#34D399',
    isManager: false,
  },
  {
    id: 'monica',
    name: 'Monica M',
    email: 'monica@xtransmatrix.com',
    initials: 'MO',
    role: 'Team Member',
    color: '#F472B6',
    isManager: false,
  },
  {
    id: 'sandhya',
    name: 'Sandhya A',
    email: 'sandhya.a@xtransmatrix.com',
    initials: 'SA',
    role: 'Team Member',
    color: '#FB923C',
    isManager: false,
  },
  {
    id: 'zeeba',
    name: 'Zeeba Kauser',
    email: 'zeeba.kauser@xtransmatrix.com',
    initials: 'ZK',
    role: 'Team Member',
    color: '#E879F9',
    isManager: false,
  },
];

export const MANAGER = TEAM.find(m => m.isManager);
export const MEMBERS = TEAM.filter(m => !m.isManager);

export function getMemberByEmail(email) {
  return TEAM.find(m => m.email.toLowerCase() === email?.toLowerCase());
}

export function getMemberById(id) {
  return TEAM.find(m => m.id === id);
}

export const PRIORITIES = [
  { value: 'critical', label: 'Critical', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', dot: '#EF4444' },
  { value: 'high',     label: 'High',     color: '#F97316', bg: 'rgba(249,115,22,0.12)', dot: '#F97316' },
  { value: 'medium',   label: 'Medium',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', dot: '#F59E0B' },
  { value: 'low',      label: 'Low',      color: '#10B981', bg: 'rgba(16,185,129,0.12)', dot: '#10B981' },
];

export const STATUSES = [
  { value: 'todo',        label: 'To do',       color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
  { value: 'in-progress', label: 'In progress', color: '#38BDF8', bg: 'rgba(56,189,248,0.12)' },
  { value: 'done',        label: 'Done',        color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
  { value: 'blocked',     label: 'Blocked',     color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
];

export function getPriority(value) {
  return PRIORITIES.find(p => p.value === value) || PRIORITIES[2];
}

export function getStatus(value) {
  return STATUSES.find(s => s.value === value) || STATUSES[0];
}
