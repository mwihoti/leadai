// ============================================================
// Linked Lead AI — Type Definitions
// ============================================================

export type CRMStatus =
  | 'new'
  | 'analyzed'
  | 'message_ready'
  | 'contacted'
  | 'follow_up_due'
  | 'replied'
  | 'call_booked'
  | 'won'
  | 'lost'
  | 'archived';

export type LeadType =
  | 'recruiter'
  | 'founder'
  | 'hiring_manager'
  | 'business_owner'
  | 'company'
  | 'agency'
  | 'unknown';

export type OpportunityType =
  | 'job'
  | 'freelance'
  | 'contract'
  | 'partnership'
  | 'consulting'
  | 'unknown';

export type TrustLevel =
  | 'legit'
  | 'needs_verification'
  | 'suspicious'
  | 'unknown';

export type MessageType =
  | 'linkedin_connection'
  | 'first_message'
  | 'follow_up'
  | 'recruiter'
  | 'founder_pitch'
  | 'business_owner_pitch'
  | 'agency_pitch'
  | 'email'
  | 'soft_close';

export type PostType =
  | 'project_demo'
  | 'technical_breakdown'
  | 'business_problem'
  | 'case_study'
  | 'hiring_availability'
  | 'service_offer'
  | 'learning_update';

export type ContentPlatform =
  | 'linkedin'
  | 'x'
  | 'medium'
  | 'blog'
  | 'newsletter'
  | 'devto'
  | 'facebook'
  | 'instagram';

export type ContentFormat =
  | 'short_post'
  | 'thread'
  | 'outline'
  | 'full_draft'
  | 'caption';

export type InteractionType =
  | 'note'
  | 'email'
  | 'call'
  | 'linkedin_message'
  | 'meeting'
  | 'other';

export type TaskType =
  | 'follow_up'
  | 'outreach'
  | 'review'
  | 'post'
  | 'add_lead'
  | 'other';

export type TaskStatus = 'pending' | 'done';

// ============================================================
// Data Models
// ============================================================

export interface UserProfile {
  id: string;
  userId: string;
  fullName: string;
  headline: string;
  skills: string[];
  portfolioSummary: string;
  cvText?: string;
  targetRoles: string[];
  targetMarkets: string[];
  defaultTone: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  techStack: string[];
  businessValue: string;
  link: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  userId: string;
  name: string;
  company: string;
  role: string;
  linkedinUrl: string;
  website: string;
  source: string;
  rawText: string;
  leadType: LeadType;
  opportunityType: OpportunityType;
  score: number;
  aiSummary: string;
  painPoint: string;
  suggestedPitch: string;
  bestProjectToMention: string;
  whyProjectMatches: string;
  recommendedNextAction: string;
  trustLevel?: TrustLevel;
  trustScore?: number;
  redFlags?: string[];
  applyMethod?: string;
  applyUrl?: string;
  bestAction?: string;
  backupAction?: string;
  followUpTiming?: string;
  messageAngle?: string;
  cvMatchScore?: number;
  cvMustHaveRequirements?: string[];
  cvNiceToHaveRequirements?: string[];
  cvStrongEvidence?: string[];
  cvMissingOrWeak?: string[];
  cvWeakSections?: string[];
  cvImprovements?: string[];
  cvPersonalizedOutreach?: string;
  cvEmailApplication?: string;
  cvCoverLetter?: string;
  cvFollowUpMessage?: string;
  tailoredCv?: string;
  cvTruthfulnessNotes?: string[];
  cvMatchUpdatedAt?: string;
  tags: string[];
  status: CRMStatus;
  followUpDate: string;
  followUpTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  userId: string;
  leadId: string;
  messageType: MessageType;
  tone: string;
  body: string;
  createdAt: string;
}

export interface Interaction {
  id: string;
  userId: string;
  leadId: string;
  interactionType: InteractionType;
  note: string;
  createdAt: string;
}

export interface DailyTask {
  id: string;
  userId: string;
  title: string;
  description: string;
  taskType: TaskType;
  status: TaskStatus;
  dueDate: string;
  reminderTime?: string;
  createdAt: string;
}

export interface TelegramReminderSettings {
  enabled: boolean;
  taskReminders: boolean;
  followUpReminders: boolean;
  postReminders: boolean;
  leadAlerts: boolean;
  dailyTaskReminderTime: string;
  followUpReminderTime: string;
  highScoreThreshold: number;
}

export interface TelegramConnection {
  connected: boolean;
  botConfigured: boolean;
  botUsername?: string;
  chatId?: number | string;
  username?: string;
  firstName?: string;
  connectedAt?: string;
}

export interface ContentReminder {
  id: string;
  userId: string;
  platform: ContentPlatform;
  platformLabel: string;
  postType: PostType;
  format: ContentFormat;
  topic: string;
  tone: string;
  sourceLink?: string;
  sourceContent?: string;
  humanInsight?: string;
  title: string;
  content: string;
  scheduledAt: string;
  status: 'scheduled' | 'sent' | 'cancelled';
  sentAt?: string;
  createdAt: string;
}

// ============================================================
// AI Types
// ============================================================

export interface AIAnalysisInput {
  leadText: string;
  userProfile: UserProfile | null;
  projects: Project[];
}

export interface AIAnalysisResult {
  name?: string;
  company?: string;
  role?: string;
  linkedin_url?: string;
  website?: string;
  source?: string;
  lead_type: LeadType;
  opportunity_type: OpportunityType;
  score: number;
  summary: string;
  pain_point: string;
  suggested_pitch: string;
  best_project_to_mention: string;
  why_this_project_matches: string;
  linkedin_connection_message: string;
  first_message: string;
  follow_up_message: string;
  recommended_next_action: string;
  trust_level: TrustLevel;
  trust_score: number;
  red_flags: string[];
  apply_method: string;
  apply_url: string;
  best_action: string;
  backup_action: string;
  follow_up_timing: string;
  message_angle: string;
  tags: string[];
}

export interface AIMessageInput {
  lead: Lead;
  userProfile: UserProfile | null;
  projects: Project[];
  messageType: MessageType;
  tone: string;
}

export interface AIMessageResult {
  body: string;
}

export interface AIPostInput {
  postType: PostType;
  platform: ContentPlatform;
  format: ContentFormat;
  topic: string;
  project?: Project;
  tone: string;
  sourceLink?: string;
  sourceContent?: string;
  humanInsight?: string;
  userProfile: UserProfile | null;
}

export interface AIPostResult {
  content: string;
}

export interface CVMatchResult {
  match_score: number;
  must_have_requirements: string[];
  nice_to_have_requirements: string[];
  strong_matching_evidence: string[];
  missing_or_weak: string[];
  weak_cv_sections: string[];
  improvements_before_applying: string[];
  personalized_outreach_message: string;
  email_application: string;
  cover_letter: string;
  follow_up_message: string;
  tailored_cv: string;
  truthfulness_notes: string[];
}

export interface CVProfileResult {
  full_name: string;
  headline: string;
  skills: string[];
  portfolio_summary: string;
  target_roles: string[];
  target_markets: string[];
}

// ============================================================
// Dashboard Stats
// ============================================================

export interface DashboardStats {
  totalLeads: number;
  highScoreLeads: number;
  followUpsDueToday: number;
  messagesReady: number;
  repliedLeads: number;
  wonOpportunities: number;
  conversionRate: number;
}
