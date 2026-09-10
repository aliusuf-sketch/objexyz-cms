import { NextRequest, NextResponse } from 'next/server';

/**
 * Throw from inside an apiRoute handler to return a specific status code
 * (e.g. 400 for a missing field) instead of the default 500.
 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Wraps a route handler with the try/catch → JSON-500 boilerplate that all
 * 14 API routes in this app were repeating verbatim. The handler just
 * returns its payload; errors become { error } with the right status, and
 * always get logged server-side (the old inline catches swallowed the
 * stack, which cost real debugging time on the Redis outage).
 */
export function apiRoute<T>(handler: (req: NextRequest) => Promise<T>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const data = await handler(req);
      return NextResponse.json(data);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 500;
      if (status >= 500) console.error('[api]', err);
      return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status });
    }
  };
}
