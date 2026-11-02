import { ok } from '@/lib/http';

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'AI Lead CRM API',
    version: '1.0.0',
    description: 'Standalone CRM APIs under /api/v1',
  },
  paths: {
    '/api/v1/auth/login': { post: { summary: 'Login' } },
    '/api/v1/auth/logout': { post: { summary: 'Logout' } },
    '/api/v1/auth/me': { get: { summary: 'Current session' } },
    '/api/v1/leads': { get: { summary: 'List leads' }, post: { summary: 'Create lead' } },
    '/api/v1/leads/ingest': { post: { summary: 'Authenticated lead ingest' } },
    '/api/v1/leads/import': { post: { summary: 'CSV/JSON import' } },
    '/api/v1/leads/export': { get: { summary: 'CSV export' } },
    '/api/v1/webhooks/google-ads': { post: { summary: 'Google Ads lead webhook' } },
    '/api/v1/webhooks/meta-leads': { get: { summary: 'Meta verify' }, post: { summary: 'Meta leads' } },
    '/api/v1/webhooks/whatsapp': { get: { summary: 'WA verify' }, post: { summary: 'WA inbound' } },
    '/api/v1/whatsapp/conversations': { get: { summary: 'List conversations' } },
    '/api/v1/voice-calls': { get: { summary: 'List calls' }, post: { summary: 'Schedule call' } },
    '/api/v1/tasks': { get: { summary: 'List tasks' }, post: { summary: 'Create task' } },
    '/api/v1/pipelines': { get: { summary: 'Pipeline board' } },
    '/api/v1/documents': { get: { summary: 'List documents' }, post: { summary: 'Create document' } },
    '/api/v1/automations': { get: { summary: 'Workflows' }, post: { summary: 'Create workflow' } },
    '/api/v1/reports/dashboard': { get: { summary: 'Dashboard metrics' } },
    '/api/v1/integrations': { get: { summary: 'Integration status' } },
    '/api/v1/workers/process': { post: { summary: 'Process job queue' } },
    '/api/health': { get: { summary: 'Health check' } },
  },
};

export async function GET() {
  return ok(spec);
}
