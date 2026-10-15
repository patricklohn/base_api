export const HTTP_STATUS = {
  // 2xx Success
  ok: 200,
  created: 201,
  accepted: 202,
  option: 204,
  no_content: 204,

  // 3xx Redirection
  moved_permanently: 301,
  found: 302,

  // 4xx Client Errors
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  method_not_allowed: 405,
  conflict: 409,
  unprocessable_entity: 422,
  too_many_requests: 429,

  // 5xx Server Errors
  internal_server_error: 500,
  not_implemented: 501,
  bad_gateway: 502,
  service_unavailable: 503,
} as const;
