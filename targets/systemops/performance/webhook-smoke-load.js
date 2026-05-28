import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.PERFORMANCE_BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '15s', target: 5 },
    { duration: '30s', target: 5 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/login`);

  check(res, {
    'status 200': (r) => r.status === 200,
    'tem conteúdo': (r) => r.body.length > 0,
  });

  sleep(1);
}
