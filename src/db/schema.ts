// ============================================================
// Linked Lead AI — Drizzle Schema (simulated for client-side)
// This file defines the data model for the in-memory/localStorage DB
// In production, replace with Drizzle ORM + Neon PostgreSQL
// ============================================================

export interface UserProfileSchema {
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

export interface ProjectSchema {
  id: string;
  userId: string;
  name: string;
  description: string;
  techStack: string[];
  businessValue: string;
  link: string;
  createdAt: string;
}

export interface LeadSchema {
  id: string;
  userId: string;
  name: string;
  company: string;
  role: string;
  linkedinUrl: string;
  website: string;
  source: string;
  rawText: string;
  leadType: string;
  opportunityType: string;
  score: number;
  aiSummary: string;
  painPoint: string;
  suggestedPitch: string;
  bestProjectToMention: string;
  whyProjectMatches: string;
  recommendedNextAction: string;
  trustLevel?: string;
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
  status: string;
  followUpDate: string;
  followUpTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageSchema {
  id: string;
  userId: string;
  leadId: string;
  messageType: string;
  tone: string;
  body: string;
  createdAt: string;
}

export interface InteractionSchema {
  id: string;
  userId: string;
  leadId: string;
  interactionType: string;
  note: string;
  createdAt: string;
}

export interface DailyTaskSchema {
  id: string;
  userId: string;
  title: string;
  description: string;
  taskType: string;
  status: string;
  dueDate: string;
  reminderTime?: string;
  createdAt: string;
}

export interface ContentReminderSchema {
  id: string;
  userId: string;
  platform: string;
  platformLabel: string;
  postType: string;
  format: string;
  topic: string;
  tone: string;
  title: string;
  content: string;
  scheduledAt: string;
  status: string;
  sentAt?: string;
  createdAt: string;
}
