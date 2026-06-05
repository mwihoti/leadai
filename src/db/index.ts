// ============================================================
// Linked Lead AI — Database Client
// Client-side storage using localStorage (simulates Neon/Drizzle)
// In production, replace this with Drizzle ORM + Neon PostgreSQL
// ============================================================

// Simple JSON-based local database
const DB_PREFIX = 'linked_lead_ai_';

export function getCollection<T>(name: string): T[] {
  try {
    const data = localStorage.getItem(DB_PREFIX + name);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveCollection<T>(name: string, data: T[]): void {
  localStorage.setItem(DB_PREFIX + name, JSON.stringify(data));
}

export function getById<T extends { id: string }>(collection: T[], id: string): T | undefined {
  return collection.find(item => item.id === id);
}

export function addItem<T extends { id: string }>(name: string, collection: T[], item: T): T {
  const updated = [...collection, item];
  saveCollection(name, updated);
  return item;
}

export function updateItem<T extends { id: string }>(name: string, collection: T[], id: string, updates: Partial<T>): T | null {
  const index = collection.findIndex(item => item.id === id);
  if (index === -1) return null;
  const updated = { ...collection[index], ...updates } as T;
  const newCollection = [...collection];
  newCollection[index] = updated;
  saveCollection(name, newCollection);
  return updated;
}

export function deleteItem<T extends { id: string }>(name: string, collection: T[], id: string): boolean {
  const filtered = collection.filter(item => item.id !== id);
  if (filtered.length === collection.length) return false;
  saveCollection(name, filtered);
  return true;
}

export function queryByUserId<T extends { userId: string }>(collection: T[], userId: string): T[] {
  return collection.filter(item => item.userId === userId);
}
