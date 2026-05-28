import http from 'k6/http';
import { check, group, sleep } from 'k6';

const baseUrl = __ENV.PERFORMANCE_BASE_URL || 'https://jsonplaceholder.typicode.com';

export const options = {
  scenarios: {
    leitura_controlada: {
      executor: 'ramping-vus',
      stages: [
        { duration: '15s', target: 5 },
        { duration: '30s', target: 10 },
        { duration: '15s', target: 0 }
      ],
      gracefulRampDown: '10s'
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
    checks: ['rate>0.99']
  }
};

export default function () {
  group('PERF-001 - leitura de usuarios', () => {
    const response = http.get(`${baseUrl}/users`, {
      tags: { endpoint: '/users' }
    });

    check(response, {
      'GET /users status 200': (res) => res.status === 200,
      'GET /users retorna lista': (res) => Array.isArray(res.json()) && res.json().length > 0
    });
  });

  group('PERF-002 - leitura de posts', () => {
    const response = http.get(`${baseUrl}/posts`, {
      tags: { endpoint: '/posts' }
    });

    check(response, {
      'GET /posts status 200': (res) => res.status === 200,
      'GET /posts retorna lista': (res) => Array.isArray(res.json()) && res.json().length > 0
    });
  });

  sleep(1);
}
