export const reviewLifecycles = ['draft', 'open', 'closed', 'archived'] as const;
export type ReviewLifecycle = typeof reviewLifecycles[number];
export const versionPublications = ['draft', 'published', 'withdrawn'] as const;
export type VersionPublication = typeof versionPublications[number];
export const projectLifecycles = ['active', 'completed', 'archived'] as const;
export type ProjectLifecycle = typeof projectLifecycles[number];
export const requestStatuses = ['new', 'discussing', 'in_progress', 'ready_for_review', 'closed', 'declined'] as const;
export type RequestStatus = typeof requestStatuses[number];
export const reviewGoals = ['feedback_only', 'select_version', 'approve_final'] as const;
export type CanonicalReviewGoal = typeof reviewGoals[number];
export const decisionTypes = ['reviewed', 'approved', 'changes_requested', 'direction_selected', 'combine_options'] as const;
export type DecisionType = typeof decisionTypes[number];
export type ReviewPermissions = { allowComments: boolean; allowReplies: boolean; allowDecisions: boolean };
export type ActivityEventType = 'request_created' | 'request_message_added' | 'request_reference_added' | 'request_status_changed' | 'request_linked_to_review' | 'review_published' | 'review_closed' | 'version_published' | 'version_withdrawn' | 'comment_added' | 'reply_added' | 'comment_resolved' | 'decision_submitted' | 'decision_invalidated';
export type AttentionCategory = 'action_required' | 'important_update' | 'waiting_for_client' | 'no_action';
export type ActiveWorkUsage = {
  activeProjects: number;
  activeStandaloneReviews: number;
  totalActiveUnits: number;
  limit: number | null;
  overLimit: boolean;
};

export function normalizeReviewLifecycle(value: unknown): ReviewLifecycle {
  if (value === 'in_review' || value === 'changes_requested' || value === 'direction_selected' || value === 'approved' || value === 'completed') return 'open';
  return reviewLifecycles.includes(value as ReviewLifecycle) ? value as ReviewLifecycle : 'draft';
}

export function normalizeVersionPublication(value: unknown): VersionPublication {
  if (value === 'ready') return 'published';
  return versionPublications.includes(value as VersionPublication) ? value as VersionPublication : 'draft';
}
