import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const MAX_ERROR_MESSAGE_LENGTH = 2000;
const MAX_STACK_LENGTH = 8000;
const REDACTED_VALUE = '[REDACTED]';
const SENSITIVE_KEY_PATTERN =
  /(authorization|cookie|password|passwd|secret|token|access[_-]?token|refresh[_-]?token|api[_-]?key|apikey|session|jwt)/i;
const SENSITIVE_VALUE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /(access[_-]?token|refresh[_-]?token|api[_-]?key|apikey|session[_-]?secret|password|secret)=([^&\s;]+)/gi,
  /(sb-[^=\s;]*token)=([^&\s;]+)/gi,
  /\b(token|secret|password)\s+([A-Za-z0-9._~+/=-]+)/gi,
];

export interface SerializedErrorLogValue {
  name: string;
  message: string;
  stack: string | null;
}

export interface ServerErrorLogInput {
  route: string;
  request?: Request;
  method?: string;
  statusCode: number;
  error: unknown;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}

function redactSensitiveText(value: string) {
  return SENSITIVE_VALUE_PATTERNS.reduce(
    (nextValue, pattern) =>
      nextValue.replace(pattern, (match, key) => {
        if (typeof key === 'string' && match.includes('=')) {
          return `${key}=${REDACTED_VALUE}`;
        }

        if (typeof key === 'string' && match.includes(' ')) {
          return `${key} ${REDACTED_VALUE}`;
        }

        return REDACTED_VALUE;
      }),
    value
  );
}

export function redactSensitiveLogValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveLogValue(item));
  }

  if (!value || typeof value !== 'object') {
    return typeof value === 'string' ? redactSensitiveText(value) : value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? REDACTED_VALUE : redactSensitiveLogValue(item),
    ])
  );
}

export function serializeErrorForLog(error: unknown): SerializedErrorLogValue {
  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      message: redactSensitiveText(error.message).slice(0, MAX_ERROR_MESSAGE_LENGTH),
      stack: error.stack ? redactSensitiveText(error.stack).slice(0, MAX_STACK_LENGTH) : null,
    };
  }

  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: redactSensitiveText(error).slice(0, MAX_ERROR_MESSAGE_LENGTH),
      stack: null,
    };
  }

  return {
    name: 'Error',
    message: '알 수 없는 오류',
    stack: null,
  };
}

export function getRequestErrorContext(request?: Request) {
  if (!request) {
    return {
      method: null,
      requestPath: null,
      query: {},
    };
  }

  const url = new URL(request.url);
  const query = redactSensitiveLogValue(Object.fromEntries(url.searchParams.entries()));

  return {
    method: request.method,
    requestPath: url.pathname,
    query,
  };
}

export function buildServerErrorLog(input: ServerErrorLogInput) {
  const error = serializeErrorForLog(input.error);
  const requestContext = getRequestErrorContext(input.request);

  return {
    source: 'next_api',
    route: input.route,
    method: input.method ?? requestContext.method,
    status_code: input.statusCode,
    error_name: error.name,
    error_message: error.message,
    error_stack: error.stack,
    user_id: input.userId ?? null,
    request_path: requestContext.requestPath,
    query: requestContext.query,
    metadata: redactSensitiveLogValue(input.metadata ?? {}),
  };
}

export async function logServerError(input: ServerErrorLogInput) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    console.error('server_error_logs insert skipped: Supabase admin env is missing');
    return;
  }

  const payload = buildServerErrorLog(input);
  const { error } = await supabase.from('server_error_logs').insert(payload);

  if (error) {
    console.error('server_error_logs insert failed', error);
  }
}
