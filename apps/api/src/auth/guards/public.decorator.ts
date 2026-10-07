import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as not requiring authentication. The guard is applied
 * globally (see JwtAuthGuard + AuthModule), so every route is protected by
 * default — this is the explicit, visible exception.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
