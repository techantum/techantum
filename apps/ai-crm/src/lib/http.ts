import { NextResponse } from 'next/server';

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function unauthorized(message = 'Unauthorized') {
  return fail(message, 401);
}

export function forbidden(message = 'Forbidden') {
  return fail(message, 403);
}

export function notFound(message = 'Not found') {
  return fail(message, 404);
}
