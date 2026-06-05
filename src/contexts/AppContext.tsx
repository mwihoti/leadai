// ============================================================
// Linked Lead AI — App Context (Global State)
// ============================================================

import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  UserProfile,
  Project,
  Lead,
  Message,
  Interaction,
  DailyTask,
  DashboardStats,
  AIAnalysisResult,
  CVMatchResult,
  CVProfileResult,
  ContentFormat,
  ContentPlatform,
  ContentReminder,
  LeadType,
  MessageType,
  OpportunityType,
  PostType,
  TelegramConnection,
  TelegramReminderSettings,
  TrustLevel,
} from '../types';
import {
  getCollection,
  saveCollection,
  addItem,
  updateItem,
  deleteItem,
  queryByUserId,
} from '../db';
import { getStoredUser, storeUser, clearAuth, AuthUser } from '../lib/auth';
import { generateAIResponse } from '../lib/ai';
import {
  DEFAULT_TELEGRAM_SETTINGS,
  getTelegramSettings,
  getTelegramStatus,
  getBackendHealth,
  loadAppSnapshot,
  saveTelegramSettings,
  sendTelegramTest,
  syncAppSnapshot,
  syncTelegramSnapshot,
} from '../lib/telegram';
import {
  LEAD_ANALYSIS_SYSTEM_PROMPT,
  MESSAGE_GENERATION_SYSTEM_PROMPT,
  POST_GENERATION_SYSTEM_PROMPT,
  CV_MATCH_SYSTEM_PROMPT,
} from '../lib/ai';
import { getTodayISO } from '../lib/utils';

// ============================================================
// State
// ============================================================

interface AppState {
  user: AuthUser | null;
  profile: UserProfile | null;
  projects: Project[];
  leads: Lead[];
  messages: Message[];
  interactions: Interaction[];
  dailyTasks: DailyTask[];
  contentReminders: ContentReminder[];
  telegramSettings: TelegramReminderSettings;
  telegramConnection: TelegramConnection;
  databaseStatus: {
    configured: boolean;
    lastSyncedAt: string;
    error: string;
  };
  isLoading: boolean;
  aiLoading: boolean;
  error: string | null;
}

const initialState: AppState = {
  user: null,
  profile: null,
  projects: [],
  leads: [],
  messages: [],
  interactions: [],
  dailyTasks: [],
  contentReminders: [],
  telegramSettings: DEFAULT_TELEGRAM_SETTINGS,
  telegramConnection: {
    connected: false,
    botConfigured: false,
  },
  databaseStatus: {
    configured: false,
    lastSyncedAt: '',
    error: '',
  },
  isLoading: false,
  aiLoading: false,
  error: null,
};

const LEAD_TYPES: LeadType[] = [
  'recruiter',
  'founder',
  'hiring_manager',
  'business_owner',
  'company',
  'agency',
  'unknown',
];

const OPPORTUNITY_TYPES: OpportunityType[] = [
  'job',
  'freelance',
  'contract',
  'partnership',
  'consulting',
  'unknown',
];

const TRUST_LEVELS: TrustLevel[] = [
  'legit',
  'needs_verification',
  'suspicious',
  'unknown',
];

const HIGH_SCORE_DEFAULT = 75;

function pickString(input: Record<string, any>, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return fallback;
}

function pickArray(input: Record<string, any>, keys: string[]): string[] {
  for (const key of keys) {
    const value = input[key];
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }
    if (typeof value === 'string' && value.trim()) {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

function pickEnum<T extends string>(input: Record<string, any>, keys: string[], allowed: T[], fallback: T): T {
  const value = pickString(input, keys, fallback).toLowerCase().replace(/[\s-]+/g, '_') as T;
  return allowed.includes(value) ? value : fallback;
}

function pickNumber(input: Record<string, any>, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = Number(input[key]);
    if (Number.isFinite(value)) {
      return Math.max(0, Math.min(100, Math.round(value)));
    }
  }
  return fallback;
}

function extractJsonObjectText(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced?.[1] || text;
  const start = source.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  return null;
}

function parseJsonObjectResponse(response: string, label: string): any {
  const jsonText = extractJsonObjectText(response);
  if (!jsonText) {
    throw new Error(`Invalid ${label} response format. Expected a JSON object but received: ${response.slice(0, 240)}`);
  }

  try {
    return JSON.parse(jsonText);
  } catch {
    throw new Error(`Invalid ${label} JSON. Please retry.`);
  }
}

function normalizeAIAnalysisResult(input: any): AIAnalysisResult {
  const source = input?.analysis && typeof input.analysis === 'object' ? input.analysis : input;
  if (!source || typeof source !== 'object') {
    throw new Error('AI response was not a valid analysis object.');
  }

  const score = pickNumber(source, ['score', 'lead_score', 'rating']);

  const result: AIAnalysisResult = {
    name: pickString(source, ['name', 'contact_name', 'poster_name', 'lead_name']),
    company: pickString(source, ['company', 'company_name', 'organization']),
    role: pickString(source, ['role', 'title', 'position', 'job_title']),
    linkedin_url: pickString(source, ['linkedin_url', 'linkedinUrl', 'linkedin']),
    website: pickString(source, ['website', 'company_website', 'apply_url', 'applyUrl']),
    source: pickString(source, ['source']),
    lead_type: pickEnum(source, ['lead_type', 'leadType', 'type'], LEAD_TYPES, 'unknown'),
    opportunity_type: pickEnum(source, ['opportunity_type', 'opportunityType', 'opportunity'], OPPORTUNITY_TYPES, 'unknown'),
    score,
    summary: pickString(source, ['summary', 'ai_summary', 'aiSummary']),
    pain_point: pickString(source, ['pain_point', 'painPoint', 'pain']),
    suggested_pitch: pickString(source, ['suggested_pitch', 'suggestedPitch', 'pitch']),
    best_project_to_mention: pickString(source, ['best_project_to_mention', 'bestProjectToMention', 'best_project']),
    why_this_project_matches: pickString(source, ['why_this_project_matches', 'whyProjectMatches', 'project_match_reason']),
    linkedin_connection_message: pickString(source, ['linkedin_connection_message', 'linkedinConnectionMessage', 'connection_message']),
    first_message: pickString(source, ['first_message', 'firstMessage', 'initial_message']),
    follow_up_message: pickString(source, ['follow_up_message', 'followUpMessage', 'followup_message']),
    recommended_next_action: pickString(source, ['recommended_next_action', 'recommendedNextAction', 'next_action']),
    trust_level: pickEnum(source, ['trust_level', 'trustLevel', 'legitimacy'], TRUST_LEVELS, 'unknown'),
    trust_score: pickNumber(source, ['trust_score', 'trustScore', 'legitimacy_score']),
    red_flags: pickArray(source, ['red_flags', 'redFlags', 'risks']),
    apply_method: pickString(source, ['apply_method', 'applyMethod', 'application_method']),
    apply_url: pickString(source, ['apply_url', 'applyUrl', 'application_url', 'url']),
    best_action: pickString(source, ['best_action', 'bestAction', 'primary_action']),
    backup_action: pickString(source, ['backup_action', 'backupAction', 'secondary_action']),
    follow_up_timing: pickString(source, ['follow_up_timing', 'followUpTiming', 'followup_timing']),
    message_angle: pickString(source, ['message_angle', 'messageAngle', 'outreach_angle']),
    tags: pickArray(source, ['tags', 'lead_tags']),
  };

  if (!result.summary || !result.suggested_pitch || !result.recommended_next_action) {
    throw new Error('AI response missed required fields. Please retry the analysis.');
  }

  return result;
}

function normalizeCVMatchResult(input: any): CVMatchResult {
  const source = input?.cv_match && typeof input.cv_match === 'object' ? input.cv_match : input;
  if (!source || typeof source !== 'object') {
    throw new Error('AI response was not a valid CV match object.');
  }

  const result: CVMatchResult = {
    match_score: pickNumber(source, ['match_score', 'matchScore', 'score']),
    must_have_requirements: pickArray(source, ['must_have_requirements', 'mustHaveRequirements', 'required']),
    nice_to_have_requirements: pickArray(source, ['nice_to_have_requirements', 'niceToHaveRequirements', 'nice_to_have']),
    strong_matching_evidence: pickArray(source, ['strong_matching_evidence', 'strongMatchingEvidence', 'strong_match', 'evidence']),
    missing_or_weak: pickArray(source, ['missing_or_weak', 'missingOrWeak', 'gaps']),
    weak_cv_sections: pickArray(source, ['weak_cv_sections', 'weakCvSections', 'weak_sections']),
    improvements_before_applying: pickArray(source, ['improvements_before_applying', 'improvementsBeforeApplying', 'improvements']),
    personalized_outreach_message: pickString(source, ['personalized_outreach_message', 'personalizedOutreachMessage', 'outreach_message']),
    email_application: pickString(source, ['email_application', 'emailApplication', 'application_email']),
    cover_letter: pickString(source, ['cover_letter', 'coverLetter']),
    follow_up_message: pickString(source, ['follow_up_message', 'followUpMessage', 'followup_message']),
    tailored_cv: pickString(source, ['tailored_cv', 'tailoredCv', 'clean_cv']),
    truthfulness_notes: pickArray(source, ['truthfulness_notes', 'truthfulnessNotes', 'notes']),
  };

  if (!result.tailored_cv || !result.personalized_outreach_message || result.must_have_requirements.length === 0) {
    throw new Error('AI response missed required CV Coach fields. Please retry the comparison.');
  }

  return result;
}

function normalizeCVProfileResult(input: any): CVProfileResult {
  const source = input?.profile && typeof input.profile === 'object' ? input.profile : input;
  if (!source || typeof source !== 'object') {
    throw new Error('AI response was not a valid profile object.');
  }

  return {
    full_name: pickString(source, ['full_name', 'fullName', 'name']),
    headline: pickString(source, ['headline', 'professional_headline', 'title']),
    skills: pickArray(source, ['skills', 'technical_skills', 'core_skills']),
    portfolio_summary: pickString(source, ['portfolio_summary', 'portfolioSummary', 'summary']),
    target_roles: pickArray(source, ['target_roles', 'targetRoles', 'roles']),
    target_markets: pickArray(source, ['target_markets', 'targetMarkets', 'markets', 'industries']),
  };
}

function cleanCVTextForProfile(text: string): string {
  return text
    .replace(/\b(?:[A-Za-z]\s+){2,}[A-Za-z]\b/g, (match) => match.replace(/\s+/g, ''))
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function hasLooseTerm(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped.split('').join('\\s*'), 'i').test(text);
}

function inferProfileFromCV(cvText: string, fallbackName: string): Partial<UserProfile> {
  const cleaned = cleanCVTextForProfile(cvText);
  const lines = cleaned.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const nameLine = lines.find((line) => (
    line.length <= 70
    && /^[A-Za-z][A-Za-z.'-]+(?:\s+[A-Za-z][A-Za-z.'-]+){1,3}$/.test(line)
    && !/(developer|engineer|architect|consultant|student|skills|summary|experience|education|email|phone|github|linkedin|portfolio)/i.test(line)
  ));

  const knownSkills = [
    'React', 'Next.js', 'React Native', 'Angular', 'Vue.js', 'Ember.js',
    'Node.js', 'Express', 'JavaScript', 'TypeScript', 'Python', 'Django', 'FastAPI',
    'Ruby on Rails', 'Rails', 'Active Record', 'GraphQL', 'REST APIs', 'API Development',
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Docker', 'CI/CD', 'GitHub Actions',
    'AWS', 'Azure', 'GCP', 'Tailwind CSS', 'HTML', 'CSS', 'Testing', 'Jest',
    'AI', 'LLM', 'AI Agents', 'Machine Learning', 'Solidity', 'Starknet', 'Cairo',
    'Cardano', 'Rust', 'Rust-bitcoin', 'Blockchain',
  ];

  const skills = Array.from(new Set(
    knownSkills.filter((skill) => hasLooseTerm(cleaned, skill))
  ));

  const roles = new Set<string>();
  if (/(fullstack|full-stack|front.?end.*back.?end)/i.test(cleaned) || (skills.includes('React') && (skills.includes('Node.js') || skills.includes('Python')))) {
    roles.add('Full-Stack Developer');
  }
  if (/(back.?end|api|server)/i.test(cleaned) || ['Node.js', 'Python', 'Django', 'FastAPI', 'Ruby on Rails', 'Rails'].some((skill) => skills.includes(skill))) {
    roles.add('Backend Developer');
  }
  if (/(front.?end|ui|react|vue|angular)/i.test(cleaned) || ['React', 'Next.js', 'Vue.js', 'Angular'].some((skill) => skills.includes(skill))) {
    roles.add('Frontend Developer');
  }
  if (skills.includes('React Native')) roles.add('Mobile Developer');
  if (/(ai agent|agentic|llm|machine learning|artificial intelligence)/i.test(cleaned)) roles.add('AI Engineer');
  if (/(blockchain|starknet|cardano|solidity|web3|rust-bitcoin)/i.test(cleaned)) roles.add('Blockchain Developer');
  if (roles.size === 0) roles.add('Software Developer');

  const markets = new Set<string>();
  if (/(web3|blockchain|starknet|cardano|solidity)/i.test(cleaned)) markets.add('Web3');
  if (/(ai|llm|agent|machine learning)/i.test(cleaned)) markets.add('AI');
  if (/(fintech|finance|payment|banking|capital|accounting|economics)/i.test(cleaned)) markets.add('FinTech');
  if (/(climate|energy|sustainability|renewable)/i.test(cleaned)) markets.add('Climate Tech');
  if (markets.size === 0) markets.add('Software');

  const headline = lines.find((line) => (
    line.length <= 120
    && /(developer|engineer|architect|consultant|full.?stack|backend|frontend|software|blockchain|ai)/i.test(line)
  )) || `${Array.from(roles).slice(0, 2).join(' | ')}${skills.length ? ` | ${skills.slice(0, 3).join(', ')}` : ''}`;

  const summarySource = lines
    .filter((line) => !/(email|phone|linkedin|github|portfolio)/i.test(line))
    .slice(0, 8)
    .join(' ');

  const portfolioSummary = summarySource.length > 80
    ? summarySource.slice(0, 700)
    : `CV evidence shows experience with ${skills.slice(0, 10).join(', ') || 'software development'}. Review and refine this summary before applying.`;

  return {
    cvText: cleaned,
    fullName: nameLine || fallbackName,
    headline,
    skills,
    portfolioSummary,
    targetRoles: Array.from(roles),
    targetMarkets: Array.from(markets),
  };
}

// ============================================================
// Actions
// ============================================================

type Action =
  | { type: 'SET_USER'; payload: AuthUser | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_AI_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PROFILE'; payload: UserProfile | null }
  | { type: 'SET_PROJECTS'; payload: Project[] }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: { id: string; updates: Partial<Project> } }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'SET_LEADS'; payload: Lead[] }
  | { type: 'ADD_LEAD'; payload: Lead }
  | { type: 'UPDATE_LEAD'; payload: { id: string; updates: Partial<Lead> } }
  | { type: 'DELETE_LEAD'; payload: string }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_INTERACTIONS'; payload: Interaction[] }
  | { type: 'ADD_INTERACTION'; payload: Interaction }
  | { type: 'SET_TASKS'; payload: DailyTask[] }
  | { type: 'ADD_TASK'; payload: DailyTask }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: Partial<DailyTask> } }
  | { type: 'SET_CONTENT_REMINDERS'; payload: ContentReminder[] }
  | { type: 'ADD_CONTENT_REMINDER'; payload: ContentReminder }
  | { type: 'UPDATE_CONTENT_REMINDER'; payload: { id: string; updates: Partial<ContentReminder> } }
  | { type: 'SET_TELEGRAM_SETTINGS'; payload: TelegramReminderSettings }
  | { type: 'SET_TELEGRAM_CONNECTION'; payload: TelegramConnection }
  | { type: 'SET_DATABASE_STATUS'; payload: Partial<AppState['databaseStatus']> }
  | { type: 'LOAD_ALL_DATA'; payload: { profile: UserProfile | null; projects: Project[]; leads: Lead[]; messages: Message[]; interactions: Interaction[]; tasks: DailyTask[]; contentReminders: ContentReminder[]; telegramSettings: TelegramReminderSettings } };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_AI_LOADING':
      return { ...state, aiLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_PROFILE':
      return { ...state, profile: action.payload };
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload };
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.payload.id ? { ...p, ...action.payload.updates } : p
        ),
      };
    case 'DELETE_PROJECT':
      return { ...state, projects: state.projects.filter((p) => p.id !== action.payload) };
    case 'SET_LEADS':
      return { ...state, leads: action.payload };
    case 'ADD_LEAD':
      return { ...state, leads: [...state.leads, action.payload] };
    case 'UPDATE_LEAD':
      return {
        ...state,
        leads: state.leads.map((l) =>
          l.id === action.payload.id ? { ...l, ...action.payload.updates } : l
        ),
      };
    case 'DELETE_LEAD':
      return { ...state, leads: state.leads.filter((l) => l.id !== action.payload) };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_INTERACTIONS':
      return { ...state, interactions: action.payload };
    case 'ADD_INTERACTION':
      return { ...state, interactions: [...state.interactions, action.payload] };
    case 'SET_TASKS':
      return { ...state, dailyTasks: action.payload };
    case 'ADD_TASK':
      return { ...state, dailyTasks: [...state.dailyTasks, action.payload] };
    case 'UPDATE_TASK':
      return {
        ...state,
        dailyTasks: state.dailyTasks.map((t) =>
          t.id === action.payload.id ? { ...t, ...action.payload.updates } : t
        ),
      };
    case 'SET_CONTENT_REMINDERS':
      return { ...state, contentReminders: action.payload };
    case 'ADD_CONTENT_REMINDER':
      return { ...state, contentReminders: [...state.contentReminders, action.payload] };
    case 'UPDATE_CONTENT_REMINDER':
      return {
        ...state,
        contentReminders: state.contentReminders.map((r) =>
          r.id === action.payload.id ? { ...r, ...action.payload.updates } : r
        ),
      };
    case 'SET_TELEGRAM_SETTINGS':
      return { ...state, telegramSettings: action.payload };
    case 'SET_TELEGRAM_CONNECTION':
      return { ...state, telegramConnection: action.payload };
    case 'SET_DATABASE_STATUS':
      return { ...state, databaseStatus: { ...state.databaseStatus, ...action.payload } };
    case 'LOAD_ALL_DATA':
      return {
        ...state,
        profile: action.payload.profile,
        projects: action.payload.projects,
        leads: action.payload.leads,
        messages: action.payload.messages,
        interactions: action.payload.interactions,
        dailyTasks: action.payload.tasks,
        contentReminders: action.payload.contentReminders,
        telegramSettings: action.payload.telegramSettings,
      };
    default:
      return state;
  }
}

// ============================================================
// Context
// ============================================================

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  // Auth
  login: (email: string, name: string) => void;
  logout: () => void;
  // Profile
  saveProfile: (profile: Partial<UserProfile>) => void;
  autofillProfileFromCV: (cvText: string) => Promise<Partial<UserProfile> | null>;
  // Projects
  addProject: (project: Omit<Project, 'id' | 'userId' | 'createdAt'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  // Leads
  addLead: (lead: Omit<Lead, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Lead | null;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  analyzeLead: (leadId: string) => Promise<void>;
  bulkImportLeads: (rawText: string) => Promise<number>;
  compareCVWithLead: (leadId: string) => Promise<void>;
  // Messages
  generateMessage: (leadId: string, messageType: MessageType, tone: string) => Promise<void>;
  // Posts
  generatePost: (postType: PostType, topic: string, tone: string, projectId?: string, platform?: ContentPlatform, format?: ContentFormat) => Promise<string>;
  scheduleContentReminder: (reminder: Omit<ContentReminder, 'id' | 'userId' | 'createdAt' | 'status'>) => ContentReminder | null;
  updateContentReminder: (id: string, updates: Partial<ContentReminder>) => void;
  // Export
  exportLeadsCSV: () => void;
  // Dashboard
  getDashboardStats: () => DashboardStats;
  getFollowUpsDue: () => Lead[];
  // Tasks
  addTask: (task: Omit<DailyTask, 'id' | 'userId' | 'createdAt'>) => void;
  updateTask: (id: string, updates: Partial<DailyTask>) => void;
  // Telegram
  updateTelegramSettings: (settings: TelegramReminderSettings) => void;
  refreshTelegramStatus: () => Promise<void>;
  sendTelegramTestMessage: () => Promise<void>;
  refreshBackendStatus: () => Promise<void>;
  syncBackendNow: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

// ============================================================
// Provider
// ============================================================

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const backendSyncTimer = useRef<number | null>(null);

  function buildSnapshot() {
    if (!state.user) return null;
    return {
      userId: state.user.id,
      name: state.user.name,
      email: state.user.email,
      profile: state.profile,
      projects: state.projects,
      interactions: state.interactions,
      settings: state.telegramSettings,
      tasks: state.dailyTasks,
      leads: state.leads,
      messages: state.messages,
      contentReminders: state.contentReminders,
    };
  }

  // Load all data from localStorage on mount
  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      dispatch({ type: 'SET_USER', payload: user });
      loadUserData(user.id);
    }
    refreshBackendStatus();
  }, []);

  useEffect(() => {
    if (!state.user) return;
    if (backendSyncTimer.current) {
      window.clearTimeout(backendSyncTimer.current);
    }
    backendSyncTimer.current = window.setTimeout(() => {
      const snapshot = buildSnapshot();
      if (!snapshot) return;

      syncAppSnapshot(snapshot)
        .then((result) => {
          dispatch({
            type: 'SET_DATABASE_STATUS',
            payload: {
              configured: result.databaseConfigured,
              lastSyncedAt: result.updatedAt || new Date().toISOString(),
              error: result.databaseConfigured ? '' : 'DATABASE_URL is not configured on the backend.',
            },
          });
        })
        .catch((err: any) => {
          dispatch({
            type: 'SET_DATABASE_STATUS',
            payload: {
              configured: false,
              error: err.message || 'Backend database sync failed.',
            },
          });
        });

      syncTelegramSnapshot(snapshot)
        .then((result) => {
          dispatch({
            type: 'SET_TELEGRAM_CONNECTION',
            payload: { ...state.telegramConnection, connected: result.connected },
          });
          for (const taskId of result.doneTaskIds || []) {
            const task = state.dailyTasks.find((t) => t.id === taskId && t.status !== 'done');
            if (task) {
              updateTask(taskId, { status: 'done' });
            }
          }
        })
        .catch(() => {
          dispatch({
            type: 'SET_TELEGRAM_CONNECTION',
            payload: { ...state.telegramConnection, botConfigured: false },
          });
        });
    }, 800);

    return () => {
      if (backendSyncTimer.current) {
        window.clearTimeout(backendSyncTimer.current);
      }
    };
  }, [
    state.user,
    state.profile,
    state.projects,
    state.interactions,
    state.telegramSettings,
    state.dailyTasks,
    state.leads,
    state.messages,
    state.contentReminders,
  ]);

  useEffect(() => {
    if (!state.user) return;

    function refreshOnFocus() {
      if (document.visibilityState === 'visible') {
        refreshTelegramStatusForUser(state.user!.id);
      }
    }

    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnFocus);

    const interval = window.setInterval(() => {
      if (!state.telegramConnection.connected) {
        refreshTelegramStatusForUser(state.user!.id);
      }
    }, 7000);

    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnFocus);
      window.clearInterval(interval);
    };
  }, [state.user, state.telegramConnection.connected]);

  function loadUserData(userId: string) {
    const profile = getCollection<UserProfile>('profiles').find((p) => p.userId === userId) || null;
    const projects = queryByUserId<Project>(getCollection<Project>('projects'), userId);
    const leads = queryByUserId<Lead>(getCollection<Lead>('leads'), userId);
    const messages = queryByUserId<Message>(getCollection<Message>('messages'), userId);
    const interactions = queryByUserId<Interaction>(getCollection<Interaction>('interactions'), userId);
    const tasks = queryByUserId<DailyTask>(getCollection<DailyTask>('daily_tasks'), userId);
    const contentReminders = queryByUserId<ContentReminder>(getCollection<ContentReminder>('content_reminders'), userId);
    const telegramSettings = getTelegramSettings();
    dispatch({ type: 'LOAD_ALL_DATA', payload: { profile, projects, leads, messages, interactions, tasks, contentReminders, telegramSettings } });
    loadRemoteUserData(userId);
    refreshTelegramStatusForUser(userId);
  }

  async function loadRemoteUserData(userId: string) {
    try {
      const snapshot = await loadAppSnapshot(userId);
      const remote = snapshot.user;
      if (!remote) return;

      const profile = remote.profile || null;
      const projects = Array.isArray(remote.projects) ? remote.projects : queryByUserId<Project>(getCollection<Project>('projects'), userId);
      const leads = Array.isArray(remote.leads) ? remote.leads : queryByUserId<Lead>(getCollection<Lead>('leads'), userId);
      const messages = Array.isArray(remote.messages) ? remote.messages : queryByUserId<Message>(getCollection<Message>('messages'), userId);
      const interactions = Array.isArray(remote.interactions) ? remote.interactions : queryByUserId<Interaction>(getCollection<Interaction>('interactions'), userId);
      const tasks = Array.isArray(remote.tasks) ? remote.tasks : queryByUserId<DailyTask>(getCollection<DailyTask>('daily_tasks'), userId);
      const contentReminders = Array.isArray(remote.contentReminders)
        ? remote.contentReminders
        : queryByUserId<ContentReminder>(getCollection<ContentReminder>('content_reminders'), userId);
      const telegramSettings = remote.settings ? { ...DEFAULT_TELEGRAM_SETTINGS, ...remote.settings } : getTelegramSettings();

      if (profile) {
        const profiles = getCollection<UserProfile>('profiles');
        const nextProfiles = profiles.some((p) => p.userId === userId)
          ? profiles.map((p) => (p.userId === userId ? profile : p))
          : [...profiles, profile];
        saveCollection('profiles', nextProfiles);
      }
      saveCollection('projects', projects);
      saveCollection('leads', leads);
      saveCollection('messages', messages);
      saveCollection('interactions', interactions);
      saveCollection('daily_tasks', tasks);
      saveCollection('content_reminders', contentReminders);
      saveTelegramSettings(telegramSettings);

      dispatch({ type: 'LOAD_ALL_DATA', payload: { profile, projects, leads, messages, interactions, tasks, contentReminders, telegramSettings } });
    } catch {
      // LocalStorage remains the offline fallback when the backend is unavailable.
    }
  }

  // ==========================================================
  // Auth
  // ==========================================================

  function login(email: string, name: string) {
    const existingUser = getStoredUser();
    if (existingUser) {
      dispatch({ type: 'SET_USER', payload: existingUser });
      loadUserData(existingUser.id);
      return;
    }
    const user = {
      id: uuidv4(),
      email,
      name,
    };
    storeUser(user);
    dispatch({ type: 'SET_USER', payload: user });
    // Seed default tasks
    seedDefaultTasks(user.id);
  }

  function logout() {
    clearAuth();
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({
      type: 'LOAD_ALL_DATA',
      payload: { profile: null, projects: [], leads: [], messages: [], interactions: [], tasks: [], contentReminders: [], telegramSettings: getTelegramSettings() },
    });
  }

  async function refreshTelegramStatusForUser(userId: string) {
    try {
      const status = await getTelegramStatus(userId);
      dispatch({
        type: 'SET_TELEGRAM_CONNECTION',
        payload: {
          connected: status.connected,
          botConfigured: status.botConfigured,
          botUsername: status.botUsername,
          chatId: status.chatId,
          username: status.username,
          firstName: status.firstName,
          connectedAt: status.connectedAt,
        },
      });
      if (status.settings) {
        const merged = { ...getTelegramSettings(), ...status.settings };
        saveTelegramSettings(merged);
        dispatch({ type: 'SET_TELEGRAM_SETTINGS', payload: merged });
      }
      if (status.connected && state.user?.id === userId) {
        const snapshot = buildSnapshot();
        if (snapshot) {
          syncAppSnapshot(snapshot).catch(() => undefined);
          syncTelegramSnapshot(snapshot).catch(() => undefined);
        }
      }
      for (const taskId of status.doneTaskIds || []) {
        const task = getCollection<DailyTask>('daily_tasks').find((t) => t.id === taskId && t.status !== 'done');
        if (task) updateTask(taskId, { status: 'done' });
      }
    } catch {
      dispatch({
        type: 'SET_TELEGRAM_CONNECTION',
        payload: { connected: false, botConfigured: false },
      });
    }
  }

  async function refreshTelegramStatus() {
    if (!state.user) return;
    await refreshTelegramStatusForUser(state.user.id);
  }

  async function refreshBackendStatus() {
    try {
      const health = await getBackendHealth();
      dispatch({
        type: 'SET_DATABASE_STATUS',
        payload: {
          configured: health.databaseConfigured,
          error: health.databaseConfigured ? '' : 'DATABASE_URL is not configured on the backend.',
        },
      });
      dispatch({
        type: 'SET_TELEGRAM_CONNECTION',
        payload: { ...state.telegramConnection, botConfigured: health.botConfigured },
      });
    } catch (err: any) {
      dispatch({
        type: 'SET_DATABASE_STATUS',
        payload: {
          configured: false,
          error: err.message || 'Backend is not reachable. Run npm run server.',
        },
      });
    }
  }

  async function syncBackendNow() {
    const snapshot = buildSnapshot();
    if (!snapshot) return;
    const result = await syncAppSnapshot(snapshot);
    dispatch({
      type: 'SET_DATABASE_STATUS',
      payload: {
        configured: result.databaseConfigured,
        lastSyncedAt: result.updatedAt || new Date().toISOString(),
        error: result.databaseConfigured ? '' : 'DATABASE_URL is not configured on the backend.',
      },
    });
  }

  async function sendTelegramTestMessage() {
    if (!state.user) return;
    await sendTelegramTest(state.user.id);
  }

  function updateTelegramSettings(settings: TelegramReminderSettings) {
    const normalized = {
      ...settings,
      highScoreThreshold: Math.max(0, Math.min(100, Number(settings.highScoreThreshold) || HIGH_SCORE_DEFAULT)),
    };
    saveTelegramSettings(normalized);
    dispatch({ type: 'SET_TELEGRAM_SETTINGS', payload: normalized });
  }

  function seedDefaultTasks(userId: string) {
    const tasks: DailyTask[] = [
      {
        id: uuidv4(),
        userId,
        title: 'Add 3 new leads',
        description: 'Find and add new leads to your pipeline',
        taskType: 'add_lead',
        status: 'pending',
        dueDate: getTodayISO(),
        reminderTime: state.telegramSettings.dailyTaskReminderTime,
        createdAt: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        userId,
        title: 'Review high-score leads',
        description: 'Check your highest scoring leads and plan outreach',
        taskType: 'review',
        status: 'pending',
        dueDate: getTodayISO(),
        reminderTime: state.telegramSettings.dailyTaskReminderTime,
        createdAt: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        userId,
        title: 'Follow up with leads',
        description: 'Send follow-up messages to leads that need attention',
        taskType: 'follow_up',
        status: 'pending',
        dueDate: getTodayISO(),
        reminderTime: state.telegramSettings.dailyTaskReminderTime,
        createdAt: new Date().toISOString(),
      },
    ];
    const existing = getCollection<DailyTask>('daily_tasks');
    saveCollection('daily_tasks', [...existing, ...tasks]);
    dispatch({ type: 'SET_TASKS', payload: [...state.dailyTasks, ...tasks] });
  }

  // ==========================================================
  // Profile
  // ==========================================================

  function saveProfile(profileData: Partial<UserProfile>) {
    if (!state.user) return;
    const profiles = getCollection<UserProfile>('profiles');
    const existing = profiles.find((p) => p.userId === state.user!.id);
    const now = new Date().toISOString();
    if (existing) {
      const updated = { ...existing, ...profileData, updatedAt: now };
      const newProfiles = profiles.map((p) => (p.id === existing.id ? updated : p));
      saveCollection('profiles', newProfiles);
      dispatch({ type: 'SET_PROFILE', payload: updated });
    } else {
      const newProfile: UserProfile = {
        id: uuidv4(),
        userId: state.user.id,
        fullName: profileData.fullName || state.user.name,
        headline: profileData.headline || '',
        skills: profileData.skills || [],
        portfolioSummary: profileData.portfolioSummary || '',
        cvText: profileData.cvText || '',
        targetRoles: profileData.targetRoles || [],
        targetMarkets: profileData.targetMarkets || [],
        defaultTone: profileData.defaultTone || 'professional',
        createdAt: now,
        updatedAt: now,
      };
      saveCollection('profiles', [...profiles, newProfile]);
      dispatch({ type: 'SET_PROFILE', payload: newProfile });
    }
  }

  async function autofillProfileFromCV(cvText: string): Promise<Partial<UserProfile> | null> {
    if (!state.user) return null;
    if (!cvText.trim()) {
      dispatch({ type: 'SET_ERROR', payload: 'Add CV text before autofilling profile fields.' });
      return null;
    }

    dispatch({ type: 'SET_AI_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const cleanedCvText = cleanCVTextForProfile(cvText);
      const inferredProfile = inferProfileFromCV(cleanedCvText, state.user.name);
      const response = await generateAIResponse({
        prompt: `Extract a concise user profile from this CV. Use only the CV content. Return JSON only.

CV:
${cleanedCvText}

Return this JSON object:
{
  "full_name": "name if present, or empty string",
  "headline": "short professional headline",
  "skills": ["skill"],
  "portfolio_summary": "2-4 sentence truthful summary of experience/projects",
  "target_roles": ["role the CV appears suited for"],
  "target_markets": ["industry, domain, or market inferred from real evidence"]
}`,
        systemPrompt: 'You extract structured profile fields from CV text. Do not invent experience, employers, degrees, dates, metrics, or skills.',
        temperature: 0.2,
        maxTokens: 2500,
      });

      let result: CVProfileResult;
      try {
        result = normalizeCVProfileResult(parseJsonObjectResponse(response, 'CV profile'));
      } catch {
        try {
          const repaired = await generateAIResponse({
            prompt: `Convert this failed CV profile extraction into valid JSON only. Use only facts present in the CV and the failed output.

CV:
${cleanedCvText}

Failed output:
${response}

Return exactly this JSON object shape:
{
  "full_name": "",
  "headline": "",
  "skills": [],
  "portfolio_summary": "",
  "target_roles": [],
  "target_markets": []
}`,
            systemPrompt: 'You repair malformed extraction output into strict JSON. Do not invent facts.',
            temperature: 0,
            maxTokens: 1800,
          });
          result = normalizeCVProfileResult(parseJsonObjectResponse(repaired, 'CV profile repair'));
        } catch {
          result = {
            full_name: '',
            headline: '',
            skills: [],
            portfolio_summary: '',
            target_roles: [],
            target_markets: [],
          };
        }
      }

      const updates: Partial<UserProfile> = {
        cvText: cleanedCvText,
        fullName: result.full_name || inferredProfile.fullName || state.profile?.fullName || state.user.name,
        headline: result.headline || inferredProfile.headline || state.profile?.headline || '',
        skills: result.skills.length ? result.skills : inferredProfile.skills || state.profile?.skills || [],
        portfolioSummary: result.portfolio_summary || inferredProfile.portfolioSummary || state.profile?.portfolioSummary || '',
        targetRoles: result.target_roles.length ? result.target_roles : inferredProfile.targetRoles || state.profile?.targetRoles || [],
        targetMarkets: result.target_markets.length ? result.target_markets : inferredProfile.targetMarkets || state.profile?.targetMarkets || [],
      };

      saveProfile(updates);
      return updates;
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to autofill profile from CV' });
      return null;
    } finally {
      dispatch({ type: 'SET_AI_LOADING', payload: false });
    }
  }

  // ==========================================================
  // Projects
  // ==========================================================

  function addProject(projectData: Omit<Project, 'id' | 'userId' | 'createdAt'>) {
    if (!state.user) return;
    const project: Project = {
      ...projectData,
      id: uuidv4(),
      userId: state.user.id,
      createdAt: new Date().toISOString(),
    };
    const projects = getCollection<Project>('projects');
    addItem('projects', projects, project);
    dispatch({ type: 'ADD_PROJECT', payload: project });
  }

  function updateProject(id: string, updates: Partial<Project>) {
    const projects = getCollection<Project>('projects');
    const updated = updateItem('projects', projects, id, updates);
    if (updated) {
      dispatch({ type: 'UPDATE_PROJECT', payload: { id, updates } });
    }
  }

  function deleteProject(id: string) {
    const projects = getCollection<Project>('projects');
    deleteItem('projects', projects, id);
    dispatch({ type: 'DELETE_PROJECT', payload: id });
  }

  // ==========================================================
  // Leads
  // ==========================================================

  function addLead(leadData: Omit<Lead, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Lead | null {
    if (!state.user) return null;
    const now = new Date().toISOString();
    const lead: Lead = {
      ...leadData,
      id: uuidv4(),
      userId: state.user.id,
      createdAt: now,
      updatedAt: now,
    };
    const leads = getCollection<Lead>('leads');
    addItem('leads', leads, lead);
    dispatch({ type: 'ADD_LEAD', payload: lead });
    return lead;
  }

  function updateLead(id: string, updates: Partial<Lead>) {
    const leads = getCollection<Lead>('leads');
    const updated = updateItem('leads', leads, id, { ...updates, updatedAt: new Date().toISOString() });
    if (updated) {
      dispatch({ type: 'UPDATE_LEAD', payload: { id, updates } });
    }
  }

  function deleteLead(id: string) {
    const leads = getCollection<Lead>('leads');
    deleteItem('leads', leads, id);
    dispatch({ type: 'DELETE_LEAD', payload: id });
  }

  // ==========================================================
  // AI: Bulk Import Leads
  // ==========================================================

  async function bulkImportLeads(rawText: string): Promise<number> {
    if (!state.user) return 0;
    dispatch({ type: 'SET_AI_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await generateAIResponse({
        prompt: buildBulkImportPrompt(rawText, state.profile, state.projects),
        systemPrompt: LEAD_ANALYSIS_SYSTEM_PROMPT,
        temperature: 0.25,
        maxTokens: 6000,
      });

      const parsed = parseJsonObjectResponse(response, 'bulk import');
      const candidates = Array.isArray(parsed.leads) ? parsed.leads : [];
      if (candidates.length === 0) {
        throw new Error('No usable leads found in the pasted text.');
      }

      const now = new Date().toISOString();
      const leads = getCollection<Lead>('leads');
      const messages = getCollection<Message>('messages');
      const interactions = getCollection<Interaction>('interactions');
      const newLeads: Lead[] = [];
      const newMessages: Message[] = [];
      const newInteractions: Interaction[] = [];

      for (const candidate of candidates.slice(0, 20)) {
        const result = normalizeAIAnalysisResult(candidate);
        const leadId = uuidv4();
        const lead: Lead = {
          id: leadId,
          userId: state.user.id,
          name: result.name || pickString(candidate, ['name', 'contact_name', 'poster_name'], result.company || 'Imported Lead'),
          company: result.company || pickString(candidate, ['company', 'company_name']),
          role: result.role || pickString(candidate, ['role', 'title', 'position']),
          linkedinUrl: result.linkedin_url || pickString(candidate, ['linkedin_url', 'linkedinUrl']),
          website: result.website || result.apply_url || pickString(candidate, ['website', 'apply_url', 'applyUrl']),
          source: result.source || pickString(candidate, ['source'], 'Bulk Paste'),
          rawText: pickString(candidate, ['raw_text', 'rawText', 'post_text', 'content'], rawText.slice(0, 1500)),
          leadType: result.lead_type,
          opportunityType: result.opportunity_type,
          score: result.score,
          aiSummary: result.summary,
          painPoint: result.pain_point,
          suggestedPitch: result.suggested_pitch,
          bestProjectToMention: result.best_project_to_mention,
          whyProjectMatches: result.why_this_project_matches,
          recommendedNextAction: result.recommended_next_action,
          trustLevel: result.trust_level,
          trustScore: result.trust_score,
          redFlags: result.red_flags,
          applyMethod: result.apply_method,
          applyUrl: result.apply_url,
          bestAction: result.best_action,
          backupAction: result.backup_action,
          followUpTiming: result.follow_up_timing,
          messageAngle: result.message_angle,
          tags: Array.from(new Set([...result.tags, 'bulk-import'])),
          status: 'analyzed',
          followUpDate: '',
          createdAt: now,
          updatedAt: now,
        };

        newLeads.push(lead);

        if (result.first_message) {
          newMessages.push({
            id: uuidv4(),
            userId: state.user.id,
            leadId,
            messageType: 'first_message',
            tone: 'professional',
            body: result.first_message,
            createdAt: now,
          });
        }

        newInteractions.push({
          id: uuidv4(),
          userId: state.user.id,
          leadId,
          interactionType: 'note',
          note: `Bulk Claude import. Match: ${result.score}/100. Trust: ${result.trust_score}/100 (${result.trust_level}).`,
          createdAt: now,
        });
      }

      saveCollection('leads', [...leads, ...newLeads]);
      saveCollection('messages', [...messages, ...newMessages]);
      saveCollection('interactions', [...interactions, ...newInteractions]);

      dispatch({ type: 'SET_LEADS', payload: [...state.leads, ...newLeads] });
      dispatch({ type: 'SET_MESSAGES', payload: [...state.messages, ...newMessages] });
      dispatch({ type: 'SET_INTERACTIONS', payload: [...state.interactions, ...newInteractions] });

      return newLeads.length;
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to import leads' });
      return 0;
    } finally {
      dispatch({ type: 'SET_AI_LOADING', payload: false });
    }
  }

  function buildBulkImportPrompt(rawText: string, profile: UserProfile | null, projects: Project[]): string {
    const projectsText = projects.length > 0
      ? projects.map((p) => `- ${p.name}: ${p.description} (Tech: ${p.techStack.join(', ')})`).join('\n')
      : 'No projects added yet.';

    const profileText = profile
      ? `Name: ${profile.fullName}\nHeadline: ${profile.headline}\nSkills: ${profile.skills.join(', ')}\nTarget Roles: ${profile.targetRoles.join(', ')}\nTarget Markets: ${profile.targetMarkets.join(', ')}`
      : 'Profile not set up yet.';

    return `Extract job, freelance, contract, partnership, recruiting, client, investor, or collaboration opportunities from this pasted LinkedIn/search text.
Ignore generic people results unless they clearly represent a hiring opportunity.
Deduplicate repeated posts and return at most 20 leads.

Pasted text:
${rawText}

User projects:
${projectsText}

User profile:
${profileText}

Return one JSON object only:
{
  "leads": [
    {
      "name": "poster, recruiter, hiring contact, or company name",
      "company": "company name",
      "role": "job title, opportunity title, or lead role",
      "linkedin_url": "LinkedIn URL if present, or empty string",
      "website": "company/apply website if present, or empty string",
      "source": "source label such as LinkedIn Job, LinkedIn Post, Company Website, Email, or Bulk Paste",
      "raw_text": "the exact relevant snippet for this lead",
      "lead_type": "recruiter | founder | hiring_manager | business_owner | company | agency | unknown",
      "opportunity_type": "job | freelance | contract | partnership | consulting | unknown",
      "score": 0,
      "summary": "short summary",
      "pain_point": "what they need",
      "suggested_pitch": "how the user should position themselves",
      "best_project_to_mention": "project name, or empty string",
      "why_this_project_matches": "short reason, or empty string",
      "first_message": "short DM/application message",
      "recommended_next_action": "specific next step",
      "trust_level": "legit | needs_verification | suspicious | unknown",
      "trust_score": 0,
      "red_flags": ["specific concern, or empty array"],
      "apply_method": "application link, DM recruiter, comment, email, company website, unknown",
      "apply_url": "application URL if present, or empty string",
      "best_action": "primary recommended action",
      "backup_action": "secondary action",
      "follow_up_timing": "when to follow up",
      "message_angle": "personalized positioning angle",
      "tags": ["tag1", "tag2"]
    }
  ]
}`;
  }

  // ==========================================================
  // AI: Analyze Lead
  // ==========================================================

  async function analyzeLead(leadId: string) {
    if (!state.user) return;
    dispatch({ type: 'SET_AI_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const lead = state.leads.find((l) => l.id === leadId) || getCollection<Lead>('leads').find((l) => l.id === leadId);
      if (!lead) throw new Error('Lead not found');

      const prompt = buildAnalysisPrompt(lead, state.profile, state.projects);

      const response = await generateAIResponse({
        prompt,
        systemPrompt: LEAD_ANALYSIS_SYSTEM_PROMPT,
        temperature: 0.4,
      });

      // Parse JSON from response
      const result = normalizeAIAnalysisResult(parseJsonObjectResponse(response, 'lead analysis'));

      // Update lead with AI analysis
      const updates: Partial<Lead> = {
        name: lead.name || result.name || result.company || lead.name,
        company: lead.company || result.company || lead.company,
        role: lead.role || result.role || lead.role,
        linkedinUrl: lead.linkedinUrl || result.linkedin_url || lead.linkedinUrl,
        website: lead.website || result.website || result.apply_url || lead.website,
        source: lead.source || result.source || 'Pasted Content',
        leadType: result.lead_type,
        opportunityType: result.opportunity_type,
        score: result.score,
        aiSummary: result.summary,
        painPoint: result.pain_point,
        suggestedPitch: result.suggested_pitch,
        bestProjectToMention: result.best_project_to_mention,
        whyProjectMatches: result.why_this_project_matches,
        recommendedNextAction: result.recommended_next_action,
        trustLevel: result.trust_level,
        trustScore: result.trust_score,
        redFlags: result.red_flags,
        applyMethod: result.apply_method,
        applyUrl: result.apply_url,
        bestAction: result.best_action,
        backupAction: result.backup_action,
        followUpTiming: result.follow_up_timing,
        messageAngle: result.message_angle,
        tags: result.tags,
        status: 'analyzed',
        updatedAt: new Date().toISOString(),
      };

      const leads = getCollection<Lead>('leads');
      const updated = updateItem('leads', leads, leadId, updates);
      if (updated) {
        dispatch({ type: 'UPDATE_LEAD', payload: { id: leadId, updates } });
      }

      // Generate messages
      const messages = getCollection<Message>('messages');
      const nextMessages = [...messages];
      const messageTypes = [
        { messageType: 'linkedin_connection' as MessageType, tone: 'professional', body: result.linkedin_connection_message },
        { messageType: 'first_message' as MessageType, tone: 'professional', body: result.first_message },
        { messageType: 'follow_up' as MessageType, tone: 'professional', body: result.follow_up_message },
      ];

      for (const msg of messageTypes) {
        if (msg.body) {
          const message: Message = {
            id: uuidv4(),
            userId: state.user.id,
            leadId,
            messageType: msg.messageType,
            tone: msg.tone,
            body: msg.body,
            createdAt: new Date().toISOString(),
          };
          nextMessages.push(message);
          dispatch({ type: 'ADD_MESSAGE', payload: message });
        }
      }
      saveCollection('messages', nextMessages);

      // Add interaction
      const interactions = getCollection<Interaction>('interactions');
      const interaction: Interaction = {
        id: uuidv4(),
        userId: state.user.id,
        leadId,
        interactionType: 'note',
        note: `Claude analysis complete. Match: ${result.score}/100. Trust: ${result.trust_score}/100 (${result.trust_level}). Opportunity: ${result.opportunity_type}.`,
        createdAt: new Date().toISOString(),
      };
      addItem('interactions', interactions, interaction);
      dispatch({ type: 'ADD_INTERACTION', payload: interaction });

    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to analyze lead' });
    } finally {
      dispatch({ type: 'SET_AI_LOADING', payload: false });
    }
  }

  function buildAnalysisPrompt(lead: Lead, profile: UserProfile | null, projects: Project[]): string {
    const projectsText = projects.length > 0
      ? projects.map((p) => `- ${p.name}: ${p.description} (Tech: ${p.techStack.join(', ')})`).join('\n')
      : 'No projects added yet.';
    
    const profileText = profile
      ? `Name: ${profile.fullName}\nHeadline: ${profile.headline}\nSkills: ${profile.skills.join(', ')}\nTarget Roles: ${profile.targetRoles.join(', ')}\nTarget Markets: ${profile.targetMarkets.join(', ')}`
      : 'Profile not set up yet.';

    return `Lead content:
${lead.rawText}

User projects:
${projectsText}

User profile:
${profileText}

Return one JSON object only, using exactly this shape:
{
  "name": "poster, recruiter, hiring contact, or company name if clear",
  "company": "company or organization name if clear",
  "role": "job title, opportunity title, or lead role if clear",
  "linkedin_url": "LinkedIn URL if present, or empty string",
  "website": "company/apply website if present, or empty string",
  "source": "source label such as LinkedIn Job, LinkedIn Post, Company Website, Email, or Pasted Content",
  "lead_type": "recruiter | founder | hiring_manager | business_owner | company | agency | unknown",
  "opportunity_type": "job | freelance | contract | partnership | consulting | unknown",
  "score": 0,
  "summary": "short summary of the opportunity",
  "pain_point": "what the lead appears to need",
  "suggested_pitch": "how the user should position themselves",
  "best_project_to_mention": "most relevant user project, or empty string",
  "why_this_project_matches": "short reason, or empty string",
  "linkedin_connection_message": "short connection request message",
  "first_message": "short first DM or application message",
  "follow_up_message": "short follow-up message",
  "recommended_next_action": "specific next step",
  "trust_level": "legit | needs_verification | suspicious | unknown",
  "trust_score": 0,
  "red_flags": ["specific concern, or empty array"],
  "apply_method": "application link, DM recruiter, comment, email, company website, unknown",
  "apply_url": "application URL if present, or empty string",
  "best_action": "primary recommended action",
  "backup_action": "secondary action if primary does not work",
  "follow_up_timing": "when to follow up",
  "message_angle": "personalized positioning angle based on user profile and projects",
  "tags": ["tag1", "tag2"]
	}`;
	  }

  // ==========================================================
  // AI: CV Coach
  // ==========================================================

  async function compareCVWithLead(leadId: string) {
    if (!state.user) return;
    dispatch({ type: 'SET_AI_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const lead = state.leads.find((l) => l.id === leadId) || getCollection<Lead>('leads').find((l) => l.id === leadId);
      if (!lead) throw new Error('Lead not found');
      if (!state.profile?.cvText?.trim()) {
        throw new Error('Add your CV text in Settings before comparing it with this role.');
      }

      const response = await generateAIResponse({
        prompt: buildCVMatchPrompt(lead, state.profile, state.projects),
        systemPrompt: CV_MATCH_SYSTEM_PROMPT,
        temperature: 0.25,
        maxTokens: 7000,
      });

      let parsedCVMatch: any;
      try {
        parsedCVMatch = parseJsonObjectResponse(response, 'CV Coach');
      } catch {
        const repaired = await generateAIResponse({
          prompt: `Convert the following CV Coach output into the required JSON object only. Do not add markdown.

Required JSON keys:
match_score, must_have_requirements, nice_to_have_requirements, strong_matching_evidence, missing_or_weak, weak_cv_sections, improvements_before_applying, personalized_outreach_message, email_application, cover_letter, follow_up_message, tailored_cv, truthfulness_notes.

Original output:
${response}`,
          systemPrompt: CV_MATCH_SYSTEM_PROMPT,
          temperature: 0,
          maxTokens: 4000,
        });
        parsedCVMatch = parseJsonObjectResponse(repaired, 'CV Coach repair');
      }

      const result = normalizeCVMatchResult(parsedCVMatch);
      const updates: Partial<Lead> = {
        cvMatchScore: result.match_score,
        cvMustHaveRequirements: result.must_have_requirements,
        cvNiceToHaveRequirements: result.nice_to_have_requirements,
        cvStrongEvidence: result.strong_matching_evidence,
        cvMissingOrWeak: result.missing_or_weak,
        cvWeakSections: result.weak_cv_sections,
        cvImprovements: result.improvements_before_applying,
        cvPersonalizedOutreach: result.personalized_outreach_message,
        cvEmailApplication: result.email_application,
        cvCoverLetter: result.cover_letter,
        cvFollowUpMessage: result.follow_up_message,
        tailoredCv: result.tailored_cv,
        cvTruthfulnessNotes: result.truthfulness_notes,
        cvMatchUpdatedAt: new Date().toISOString(),
      };

      const leads = getCollection<Lead>('leads');
      const updated = updateItem('leads', leads, leadId, updates);
      if (updated) {
        dispatch({ type: 'UPDATE_LEAD', payload: { id: leadId, updates } });
      }

      const interactions = getCollection<Interaction>('interactions');
      const interaction: Interaction = {
        id: uuidv4(),
        userId: state.user.id,
        leadId,
        interactionType: 'note',
        note: `Claude CV Coach complete. CV match: ${result.match_score}/100. ${result.missing_or_weak.length} gap${result.missing_or_weak.length === 1 ? '' : 's'} identified.`,
        createdAt: new Date().toISOString(),
      };
      addItem('interactions', interactions, interaction);
      dispatch({ type: 'ADD_INTERACTION', payload: interaction });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to compare CV with role' });
    } finally {
      dispatch({ type: 'SET_AI_LOADING', payload: false });
    }
  }

  function buildCVMatchPrompt(lead: Lead, profile: UserProfile, projects: Project[]): string {
    const projectsText = projects.length > 0
      ? projects.map((p) => `- ${p.name}: ${p.description}\n  Tech/skills: ${p.techStack.join(', ')}\n  Business value: ${p.businessValue}\n  Link: ${p.link}`).join('\n')
      : 'No portfolio projects added.';

    return `Compare this user's CV against this opportunity. Be strict and truthful.

Opportunity:
Company: ${lead.company}
Role: ${lead.role}
Source: ${lead.source}
Summary: ${lead.aiSummary}
Pain point: ${lead.painPoint}
Apply method: ${lead.applyMethod || 'unknown'}
Original role/post text:
${lead.rawText}

User profile:
Name: ${profile.fullName}
Headline: ${profile.headline}
Skills: ${profile.skills.join(', ')}
Target roles: ${profile.targetRoles.join(', ')}
Target markets: ${profile.targetMarkets.join(', ')}
Portfolio summary: ${profile.portfolioSummary}

Portfolio projects:
${projectsText}

CV text:
${profile.cvText}

Return one JSON object only:
{
  "match_score": 0,
  "must_have_requirements": ["requirement from role"],
  "nice_to_have_requirements": ["nice-to-have from role"],
  "strong_matching_evidence": ["CV/project evidence that directly matches the role"],
  "missing_or_weak": ["missing or weak requirement evidence"],
  "weak_cv_sections": ["CV section and why it is weak"],
  "improvements_before_applying": ["specific truthful CV/application improvement"],
  "personalized_outreach_message": "short LinkedIn DM based only on true evidence",
  "email_application": "concise application email based only on true evidence",
  "cover_letter": "brief role-targeted cover letter based only on true evidence",
  "follow_up_message": "short follow-up message",
  "tailored_cv": "clean ATS-friendly tailored CV using only the user's real CV/profile/project evidence",
  "truthfulness_notes": ["what was not included because it was not evidenced"]
}`;
  }

  // ==========================================================
  // AI: Generate Message
  // ==========================================================

  async function generateMessage(leadId: string, messageType: MessageType, tone: string) {
    if (!state.user) return;
    dispatch({ type: 'SET_AI_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const lead = state.leads.find((l) => l.id === leadId);
      if (!lead) throw new Error('Lead not found');

      const prompt = `Generate a ${messageType} message with a ${tone} tone for this lead:

Lead Name: ${lead.name}
Company: ${lead.company}
Role: ${lead.role}
Lead Type: ${lead.leadType}
Opportunity: ${lead.opportunityType}
Score: ${lead.score}
Pain Point: ${lead.painPoint}
Suggested Pitch: ${lead.suggestedPitch}
Best Project: ${lead.bestProjectToMention}
Why Project Matches: ${lead.whyProjectMatches}

User Skills: ${state.profile?.skills.join(', ') || 'Full-stack development'}
User Portfolio Summary: ${state.profile?.portfolioSummary || ''}

Generate only the message body. Keep it under 200 words.`;

      const response = await generateAIResponse({
        prompt,
        systemPrompt: MESSAGE_GENERATION_SYSTEM_PROMPT,
        temperature: 0.7,
      });

      const message: Message = {
        id: uuidv4(),
        userId: state.user.id,
        leadId,
        messageType,
        tone,
        body: response.trim(),
        createdAt: new Date().toISOString(),
      };

      const messages = getCollection<Message>('messages');
      addItem('messages', messages, message);
      dispatch({ type: 'ADD_MESSAGE', payload: message });

    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to generate message' });
    } finally {
      dispatch({ type: 'SET_AI_LOADING', payload: false });
    }
  }

  // ==========================================================
  // AI: Generate Post
  // ==========================================================

  async function generatePost(
    postType: PostType,
    topic: string,
    tone: string,
    projectId?: string,
    platform: ContentPlatform = 'linkedin',
    format: ContentFormat = 'short_post'
  ): Promise<string> {
    dispatch({ type: 'SET_AI_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const project = projectId ? state.projects.find((p) => p.id === projectId) : undefined;
      const platformGuide: Record<ContentPlatform, string> = {
        linkedin: 'a professional LinkedIn post with a clear hook, concise paragraphs, and useful hashtags',
        x: format === 'thread' ? 'an X/Twitter thread with numbered posts and a strong opening tweet' : 'a concise X/Twitter post under 280 characters when possible',
        medium: format === 'outline' ? 'a Medium article outline with section headings and bullet points' : 'a Medium article draft with headline, intro, sections, and conclusion',
        blog: format === 'outline' ? 'a blog post outline with SEO-friendly headings' : 'a complete blog post draft with headline, introduction, sections, and conclusion',
        newsletter: 'an email newsletter draft with subject line, preview text, body, and call to action',
        devto: 'a Dev.to technical article draft with title, tags, introduction, code-friendly structure, and conclusion',
        facebook: 'a Facebook post with a conversational tone and practical takeaway',
        instagram: 'an Instagram caption with a strong first line, compact body, and relevant hashtags',
      };

      const prompt = `Generate ${platformGuide[platform]}.

Platform: ${platform}
Format: ${format}
Post Type: ${postType}
Topic: ${topic}
Tone: ${tone}

User Skills: ${state.profile?.skills.join(', ') || 'Full-stack development'}
User Portfolio Summary: ${state.profile?.portfolioSummary || ''}

${project ? `Project to mention: ${project.name}
Project Description: ${project.description}
Tech Stack: ${project.techStack.join(', ')}
Business Value: ${project.businessValue}` : ''}

Use the user's real profile and project details only. Make the content ready to copy and post on the selected platform.`;

      const response = await generateAIResponse({
        prompt,
        systemPrompt: POST_GENERATION_SYSTEM_PROMPT,
        temperature: 0.7,
      });

      return response.trim();
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to generate post' });
      return '';
    } finally {
      dispatch({ type: 'SET_AI_LOADING', payload: false });
    }
  }

  function scheduleContentReminder(reminderData: Omit<ContentReminder, 'id' | 'userId' | 'createdAt' | 'status'>): ContentReminder | null {
    if (!state.user) return null;
    const reminder: ContentReminder = {
      ...reminderData,
      id: uuidv4(),
      userId: state.user.id,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    };
    const reminders = getCollection<ContentReminder>('content_reminders');
    addItem('content_reminders', reminders, reminder);
    dispatch({ type: 'ADD_CONTENT_REMINDER', payload: reminder });
    return reminder;
  }

  function updateContentReminder(id: string, updates: Partial<ContentReminder>) {
    const reminders = getCollection<ContentReminder>('content_reminders');
    const updated = updateItem('content_reminders', reminders, id, updates);
    if (updated) {
      dispatch({ type: 'UPDATE_CONTENT_REMINDER', payload: { id, updates } });
    }
  }

  // ==========================================================
  // CSV Export
  // ==========================================================

  function exportLeadsCSV() {
    // Import utils dynamically
    import('../lib/utils').then(({ leadsToCSV, downloadFile }) => {
      const csv = leadsToCSV(state.leads);
      downloadFile(csv, `linked-lead-ai-export-${getTodayISO()}.csv`);
    });
  }

  // ==========================================================
  // Dashboard Stats
  // ==========================================================

  function getDashboardStats(): DashboardStats {
    const leads = state.leads;
    const totalLeads = leads.length;
    const highScoreLeads = leads.filter((l) => l.score >= 60).length;
    const followUpsDueToday = leads.filter(
      (l) => l.followUpDate === getTodayISO() && !['won', 'lost', 'archived'].includes(l.status)
    ).length;
    const messagesReady = leads.filter((l) => l.status === 'message_ready').length;
    const repliedLeads = leads.filter((l) => l.status === 'replied').length;
    const wonOpportunities = leads.filter((l) => l.status === 'won').length;
    const contactedCount = leads.filter((l) =>
      ['contacted', 'follow_up_due', 'replied', 'call_booked', 'won'].includes(l.status)
    ).length;
    const conversionRate = contactedCount > 0 ? Math.round((wonOpportunities / contactedCount) * 100) : 0;

    return {
      totalLeads,
      highScoreLeads,
      followUpsDueToday,
      messagesReady,
      repliedLeads,
      wonOpportunities,
      conversionRate,
    };
  }

  function getFollowUpsDue(): Lead[] {
    const today = getTodayISO();
    return state.leads.filter(
      (l) =>
        l.followUpDate &&
        l.followUpDate <= today &&
        !['won', 'lost', 'archived'].includes(l.status)
    );
  }

  // ==========================================================
  // Tasks
  // ==========================================================

  function addTask(taskData: Omit<DailyTask, 'id' | 'userId' | 'createdAt'>) {
    if (!state.user) return;
    const task: DailyTask = {
      ...taskData,
      id: uuidv4(),
      userId: state.user.id,
      createdAt: new Date().toISOString(),
    };
    const tasks = getCollection<DailyTask>('daily_tasks');
    addItem('daily_tasks', tasks, task);
    dispatch({ type: 'ADD_TASK', payload: task });
  }

  function updateTask(id: string, updates: Partial<DailyTask>) {
    const tasks = getCollection<DailyTask>('daily_tasks');
    const updated = updateItem('daily_tasks', tasks, id, updates);
    if (updated) {
      dispatch({ type: 'UPDATE_TASK', payload: { id, updates } });
    }
  }

  // ==========================================================
  // Render
  // ==========================================================

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        login,
        logout,
        saveProfile,
        autofillProfileFromCV,
        addProject,
        updateProject,
        deleteProject,
        addLead,
        updateLead,
        deleteLead,
        analyzeLead,
        bulkImportLeads,
        compareCVWithLead,
        generateMessage,
        generatePost,
        scheduleContentReminder,
        updateContentReminder,
        exportLeadsCSV,
        getDashboardStats,
        getFollowUpsDue,
        addTask,
        updateTask,
        updateTelegramSettings,
        refreshTelegramStatus,
        sendTelegramTestMessage,
        refreshBackendStatus,
        syncBackendNow,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
