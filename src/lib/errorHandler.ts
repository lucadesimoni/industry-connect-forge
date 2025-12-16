/**
 * Centralized error handling utility to prevent database schema information leakage
 * Maps database errors to user-friendly messages without exposing internal details
 */

export function mapErrorToUserMessage(error: unknown): string {
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const msg = errorMessage.toLowerCase();

  // Authentication errors - safe to show
  if (msg.includes('authentication required')) {
    return errorMessage;
  }
  if (msg.includes('please sign in')) {
    return errorMessage;
  }

  // Map database errors to user-friendly messages
  if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
    return 'This item already exists. Please use a different identifier.';
  }
  
  if (msg.includes('foreign key')) {
    return 'Cannot complete this action due to existing relationships.';
  }
  
  if (msg.includes('violates check constraint')) {
    return 'Invalid data provided. Please check your inputs.';
  }
  
  if (msg.includes('row-level security') || msg.includes('rls')) {
    return 'You do not have permission to perform this action.';
  }
  
  if (msg.includes('not found')) {
    return 'The requested item could not be found.';
  }
  
  if (msg.includes('permission denied') || msg.includes('access denied')) {
    return 'You do not have permission to perform this action.';
  }
  
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'A network error occurred. Please check your connection and try again.';
  }
  
  if (msg.includes('timeout')) {
    return 'The request timed out. Please try again.';
  }

  // Default message - don't expose internal details
  return 'An error occurred. Please try again or contact support.';
}
