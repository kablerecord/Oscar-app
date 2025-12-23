/**
 * Privacy Access Audit Logging
 *
 * Logs all access to memory vault for privacy compliance.
 * Supports querying, export, and retention policies.
 */

import type { AccessLogEntry, MemoryCategory } from '../types';

// In-memory audit log storage
const auditLog: AccessLogEntry[] = [];

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log an access event
 */
export function logAccess(
  entry: Omit<AccessLogEntry, 'id' | 'timestamp'>
): AccessLogEntry {
  const logEntry: AccessLogEntry = {
    id: generateId(),
    ...entry,
    timestamp: new Date(),
  };

  auditLog.push(logEntry);
  return logEntry;
}

/**
 * Get all access logs
 */
export function getAllLogs(): AccessLogEntry[] {
  return [...auditLog];
}

/**
 * Get logs for a specific user
 */
export function getLogsByUser(userId: string): AccessLogEntry[] {
  return auditLog.filter((log) => log.userId === userId);
}

/**
 * Get logs by requester (plugin/component)
 */
export function getLogsByRequester(requesterId: string): AccessLogEntry[] {
  return auditLog.filter((log) => log.requesterId === requesterId);
}

/**
 * Get logs by requester type
 */
export function getLogsByRequesterType(
  requesterType: 'plugin' | 'component' | 'user'
): AccessLogEntry[] {
  return auditLog.filter((log) => log.requesterType === requesterType);
}

/**
 * Get logs within a time range
 */
export function getLogsByTimeRange(
  start: Date,
  end: Date
): AccessLogEntry[] {
  return auditLog.filter(
    (log) => log.timestamp >= start && log.timestamp <= end
  );
}

/**
 * Get logs where specific categories were requested
 */
export function getLogsByCategory(
  category: MemoryCategory
): AccessLogEntry[] {
  return auditLog.filter((log) =>
    log.categoriesRequested.includes(category)
  );
}

/**
 * Get logs where redactions were applied
 */
export function getLogsWithRedactions(): AccessLogEntry[] {
  return auditLog.filter((log) => log.redactionsApplied.length > 0);
}

/**
 * Get access statistics for a user
 */
export function getUserAccessStats(userId: string): {
  totalAccesses: number;
  byRequesterType: Record<string, number>;
  byCategory: Record<MemoryCategory, number>;
  redactionCount: number;
} {
  const logs = getLogsByUser(userId);

  const byRequesterType: Record<string, number> = {};
  const byCategory: Partial<Record<MemoryCategory, number>> = {};
  let redactionCount = 0;

  for (const log of logs) {
    // Count by requester type
    byRequesterType[log.requesterType] =
      (byRequesterType[log.requesterType] || 0) + 1;

    // Count by category
    for (const cat of log.categoriesRequested) {
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }

    // Count redactions
    redactionCount += log.redactionsApplied.length;
  }

  return {
    totalAccesses: logs.length,
    byRequesterType,
    byCategory: byCategory as Record<MemoryCategory, number>,
    redactionCount,
  };
}

/**
 * Get plugin access statistics
 */
export function getPluginAccessStats(pluginId: string): {
  totalAccesses: number;
  uniqueUsers: number;
  categoriesRequested: MemoryCategory[];
  categoriesProvided: MemoryCategory[];
  redactionRate: number;
} {
  const logs = getLogsByRequester(pluginId);
  const uniqueUsers = new Set(logs.map((l) => l.userId)).size;

  const categoriesRequested = new Set<MemoryCategory>();
  const categoriesProvided = new Set<MemoryCategory>();
  let accessesWithRedactions = 0;

  for (const log of logs) {
    log.categoriesRequested.forEach((c) => categoriesRequested.add(c));
    log.categoriesProvided.forEach((c) => categoriesProvided.add(c));
    if (log.redactionsApplied.length > 0) accessesWithRedactions++;
  }

  return {
    totalAccesses: logs.length,
    uniqueUsers,
    categoriesRequested: Array.from(categoriesRequested),
    categoriesProvided: Array.from(categoriesProvided),
    redactionRate: logs.length > 0 ? accessesWithRedactions / logs.length : 0,
  };
}

/**
 * Get recent suspicious access patterns
 */
export function detectSuspiciousPatterns(): {
  highVolumeRequesters: Array<{ requesterId: string; count: number }>;
  blockedCategoryAttempts: AccessLogEntry[];
  unusualTimeAccess: AccessLogEntry[];
} {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentLogs = getLogsByTimeRange(oneHourAgo, new Date());

  // Count requests by requester
  const requesterCounts = new Map<string, number>();
  for (const log of recentLogs) {
    requesterCounts.set(
      log.requesterId,
      (requesterCounts.get(log.requesterId) || 0) + 1
    );
  }

  // Find high volume requesters (more than 100 in an hour)
  const highVolumeRequesters: Array<{ requesterId: string; count: number }> = [];
  for (const [requesterId, count] of requesterCounts) {
    if (count > 100) {
      highVolumeRequesters.push({ requesterId, count });
    }
  }

  // Find blocked category attempts (requested but not provided)
  const blockedCategoryAttempts = recentLogs.filter((log) =>
    log.categoriesRequested.some(
      (cat) => !log.categoriesProvided.includes(cat)
    )
  );

  // Find unusual time access (3-5 AM local time)
  const unusualTimeAccess = recentLogs.filter((log) => {
    const hour = log.timestamp.getHours();
    return hour >= 3 && hour <= 5;
  });

  return {
    highVolumeRequesters,
    blockedCategoryAttempts,
    unusualTimeAccess,
  };
}

/**
 * Export audit log for compliance
 */
export function exportAuditLog(
  userId?: string,
  startDate?: Date,
  endDate?: Date
): AccessLogEntry[] {
  let logs = [...auditLog];

  if (userId) {
    logs = logs.filter((l) => l.userId === userId);
  }

  if (startDate) {
    logs = logs.filter((l) => l.timestamp >= startDate);
  }

  if (endDate) {
    logs = logs.filter((l) => l.timestamp <= endDate);
  }

  return logs;
}

/**
 * Prune old logs (retention policy)
 */
export function pruneOldLogs(retentionDays: number = 90): number {
  const cutoffDate = new Date(
    Date.now() - retentionDays * 24 * 60 * 60 * 1000
  );

  const originalLength = auditLog.length;

  // Filter in place
  let writeIndex = 0;
  for (let readIndex = 0; readIndex < auditLog.length; readIndex++) {
    if (auditLog[readIndex].timestamp >= cutoffDate) {
      auditLog[writeIndex++] = auditLog[readIndex];
    }
  }
  auditLog.length = writeIndex;

  return originalLength - auditLog.length;
}

/**
 * Clear all logs (for testing)
 */
export function clearLogs(): void {
  auditLog.length = 0;
}

/**
 * Get log count
 */
export function getLogCount(): number {
  return auditLog.length;
}
