import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/tokens';
import { AppError, errorCodes } from '../utils/errors';
import { AuthRequest } from '../types';
import { Role } from '@prisma/client';

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401, errorCodes.UNAUTHORIZED));
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    return next(new AppError('Invalid or expired token', 401, errorCodes.UNAUTHORIZED));
  }
}

export function requireRoles(...roles: Role[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, errorCodes.UNAUTHORIZED));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403, errorCodes.FORBIDDEN));
    }
    next();
  };
}

export const adminOnly = requireRoles(Role.ADMIN);
export const pmOrAdmin = requireRoles(Role.ADMIN, Role.PROJECT_MANAGER);
export const allAuthenticated = requireRoles(Role.ADMIN, Role.PROJECT_MANAGER, Role.DEVELOPER);
