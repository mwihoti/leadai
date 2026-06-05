// ============================================================
// Linked Lead AI — Utility Functions
// ============================================================

import { format, isToday, isPast, isFuture, parseISO } from 'date-fns';
import type { CRMStatus, LeadType, OpportunityType, TrustLevel } from '../types';

/**
 * Format a date string to a readable format
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    return format(parseISO(dateStr), 'MMM dd, yyyy');
  } catch {
    return dateStr;
  }
}

/**
 * Format a date string for display (short)
 */
export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    return format(parseISO(dateStr), 'MMM dd');
  } catch {
    return dateStr;
  }
}

/**
 * Check if a date is today
 */
export function isDateToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  try {
    return isToday(parseISO(dateStr));
  } catch {
    return false;
  }
}

/**
 * Check if a date is in the past
 */
export function isDatePast(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  try {
    return isPast(parseISO(dateStr));
  } catch {
    return false;
  }
}

/**
 * Check if a date is in the future
 */
export function isDateFuture(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  try {
    return isFuture(parseISO(dateStr));
  } catch {
    return false;
  }
}

/**
 * Get today's date as ISO string
 */
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get score color class
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
  if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
  if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  if (score >= 20) return 'text-orange-600 bg-orange-50 border-orange-200';
  return 'text-gray-600 bg-gray-50 border-gray-200';
}

/**
 * Get score label
 */
export function getScoreLabel(score: number): string {
  if (score >= 80) return 'High Priority';
  if (score >= 60) return 'Good Lead';
  if (score >= 40) return 'Medium Priority';
  if (score >= 20) return 'Weak Lead';
  return 'Low Relevance';
}

export function getTrustColor(level: TrustLevel | undefined): string {
  const colors: Record<TrustLevel, string> = {
    legit: 'text-green-700 bg-green-50 border-green-200',
    needs_verification: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    suspicious: 'text-red-700 bg-red-50 border-red-200',
    unknown: 'text-gray-600 bg-gray-50 border-gray-200',
  };
  return colors[level || 'unknown'];
}

export function getTrustLabel(level: TrustLevel | undefined): string {
  const labels: Record<TrustLevel, string> = {
    legit: 'Legit',
    needs_verification: 'Needs Verification',
    suspicious: 'Suspicious',
    unknown: 'Unknown',
  };
  return labels[level || 'unknown'];
}

/**
 * Get status display label
 */
export function getStatusLabel(status: CRMStatus): string {
  const labels: Record<CRMStatus, string> = {
    new: 'New',
    analyzed: 'Analyzed',
    message_ready: 'Message Ready',
    contacted: 'Contacted',
    follow_up_due: 'Follow-up Due',
    replied: 'Replied',
    call_booked: 'Call Booked',
    won: 'Won',
    lost: 'Lost',
    archived: 'Archived',
  };
  return labels[status] || status;
}

/**
 * Get status color class
 */
export function getStatusColor(status: CRMStatus): string {
  const colors: Record<CRMStatus, string> = {
    new: 'bg-gray-100 text-gray-700 border-gray-200',
    analyzed: 'bg-blue-50 text-blue-700 border-blue-200',
    message_ready: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    contacted: 'bg-purple-50 text-purple-700 border-purple-200',
    follow_up_due: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    replied: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    call_booked: 'bg-orange-50 text-orange-700 border-orange-200',
    won: 'bg-green-50 text-green-700 border-green-200',
    lost: 'bg-red-50 text-red-700 border-red-200',
    archived: 'bg-gray-50 text-gray-500 border-gray-200',
  };
  return colors[status] || colors.new;
}

/**
 * Get lead type display
 */
export function getLeadTypeLabel(type: LeadType): string {
  const labels: Record<LeadType, string> = {
    recruiter: 'Recruiter',
    founder: 'Founder',
    hiring_manager: 'Hiring Manager',
    business_owner: 'Business Owner',
    company: 'Company',
    agency: 'Agency',
    unknown: 'Unknown',
  };
  return labels[type] || type;
}

/**
 * Get opportunity type display
 */
export function getOpportunityTypeLabel(type: OpportunityType): string {
  const labels: Record<OpportunityType, string> = {
    job: 'Job',
    freelance: 'Freelance',
    contract: 'Contract',
    partnership: 'Partnership',
    consulting: 'Consulting',
    unknown: 'Unknown',
  };
  return labels[type] || type;
}

/**
 * Truncate text
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Convert leads to CSV
 */
export function leadsToCSV(leads: any[]): string {
  const headers = [
    'Name',
    'Company',
    'Role',
    'Lead Type',
    'Opportunity Type',
    'Score',
    'Status',
    'Follow-up Date',
    'Suggested Pitch',
    'Created Date',
  ];

  const rows = leads.map((lead) => [
    escapeCSV(lead.name || ''),
    escapeCSV(lead.company || ''),
    escapeCSV(lead.role || ''),
    escapeCSV(getLeadTypeLabel(lead.leadType)),
    escapeCSV(getOpportunityTypeLabel(lead.opportunityType)),
    lead.score?.toString() || '',
    escapeCSV(getStatusLabel(lead.status)),
    formatDate(lead.followUpDate),
    escapeCSV(lead.suggestedPitch || ''),
    formatDate(lead.createdAt),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Download a file
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
