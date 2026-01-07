import { Request } from 'express';

export const accessTokenExtractor = (req: Request): string | null => {
  return req?.cookies?.['access_token'] || null;
};

export const refreshTokenExtractor = (req: Request): string | null => {
  return req?.cookies?.['refresh_token'] || null;
};
