// Standardized error classes for API layer
export class AppError extends Error { constructor(message: string, public status=500, public code='SERVER_ERROR'){ super(message) } }
export class AuthError extends AppError { constructor(message='Unauthenticated'){ super(message, 401,'UNAUTHENTICATED') } }
export class ForbiddenError extends AppError { constructor(message='Forbidden'){ super(message, 403,'FORBIDDEN') } }
export class NotFoundError extends AppError { constructor(message='Not Found'){ super(message, 404,'NOT_FOUND') } }
export class ValidationError extends AppError { constructor(message='Invalid input', public issues?: unknown){ super(message,400,'VALIDATION_ERROR') } }
export class ConflictError extends AppError { constructor(message='Conflict'){ super(message,409,'CONFLICT') } }
export class RateLimitError extends AppError { constructor(message='Too Many Requests'){ super(message,429,'RATE_LIMITED') } }

// Error response serialization moved to lib/api/error-handler.ts
