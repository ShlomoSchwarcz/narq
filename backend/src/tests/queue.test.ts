import * as request from 'supertest';

const BASE_URL = 'http://localhost:3001';
const TEST_QUEUE_NAME = 'narq_test_suite';

describe('NARQ API Tests', () => {
  let queueId: number;

  beforeAll(async () => {
    await request(BASE_URL).delete(`/queues/${TEST_QUEUE_NAME}`);
    await request(BASE_URL).delete('/queues/narq_test_delete_by_id');
  });

  afterAll(async () => {
    await request(BASE_URL).delete(`/queues/${TEST_QUEUE_NAME}`);
    await request(BASE_URL).delete('/queues/narq_test_delete_by_id');
  });

  // ── Health ──────────────────────────────────────────────────────────────────

  describe('GET /health', () => {
    it('returns 200 with status ok', async () => {
      const res = await request(BASE_URL).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  // ── Queue endpoints ─────────────────────────────────────────────────────────

  describe('Queue endpoints', () => {
    describe('POST /queues', () => {
      it('creates a new queue', async () => {
        const res = await request(BASE_URL)
          .post('/queues')
          .send({ name: TEST_QUEUE_NAME })
          .set('Content-Type', 'application/json');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('name', TEST_QUEUE_NAME);
        queueId = res.body.id;
      });
    });

    describe('GET /queues/:name', () => {
      it('returns the queue by name', async () => {
        const res = await request(BASE_URL).get(`/queues/${TEST_QUEUE_NAME}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('name', TEST_QUEUE_NAME);
      });

      it('returns 404 for a nonexistent queue', async () => {
        const res = await request(BASE_URL).get('/queues/no_such_queue_xyz');
        expect(res.status).toBe(404);
      });
    });

    describe('GET /queues', () => {
      it('returns a list of queues', async () => {
        const res = await request(BASE_URL).get('/queues');
        expect(res.status).toBe(200);
        expect(res.body).toBeTruthy();
      });
    });

    describe('GET /queues/page', () => {
      it('returns paginated queues', async () => {
        const res = await request(BASE_URL).get('/queues/page?page=1&limit=10');
        expect(res.status).toBe(200);
      });

      it('respects sortField and sortOrder query params', async () => {
        const res = await request(BASE_URL).get('/queues/page?page=1&limit=5&sortField=name&sortOrder=asc');
        expect(res.status).toBe(200);
      });
    });
  });

  // ── Message endpoints ───────────────────────────────────────────────────────

  describe('Message endpoints', () => {
    let pendingMessageId: number;
    let inProgressMessageId: number;

    describe('POST /queues/:queueId/messages', () => {
      it('enqueues a message', async () => {
        const res = await request(BASE_URL)
          .post(`/queues/${queueId}/messages`)
          .send({ content: { hello: 'world' }, priority: 5 })
          .set('Content-Type', 'application/json');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('queue_id', queueId);
        expect(res.body).toHaveProperty('state', 'pending');
        pendingMessageId = res.body.id;
      });

      it('enqueues a message with group_id and max_attempts', async () => {
        const res = await request(BASE_URL)
          .post(`/queues/${queueId}/messages`)
          .send({ content: { task: 'grouped' }, group_id: '1', max_attempts: 3 })
          .set('Content-Type', 'application/json');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('group_id', '1');
      });

      it('enqueues a delayed message via ready_at', async () => {
        const future = new Date(Date.now() + 60_000).toISOString();
        const res = await request(BASE_URL)
          .post(`/queues/${queueId}/messages`)
          .send({ content: { delayed: true }, ready_at: future })
          .set('Content-Type', 'application/json');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('state', 'delayed');
      });
    });

    describe('GET /queues/:queueId/messages', () => {
      it('returns all messages in the queue', async () => {
        const res = await request(BASE_URL).get(`/queues/${queueId}/messages`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('rows');
        expect(res.body).toHaveProperty('totalCount');
        expect(res.body.rows.length).toBeGreaterThan(0);
      });

      it('filters by state=pending', async () => {
        const res = await request(BASE_URL).get(`/queues/${queueId}/messages?state=pending`);
        expect(res.status).toBe(200);
        expect(res.body.rows.every((m: any) => m.state === 'pending')).toBe(true);
      });

      it('filters by state=delayed', async () => {
        const res = await request(BASE_URL).get(`/queues/${queueId}/messages?state=delayed`);
        expect(res.status).toBe(200);
        expect(res.body.rows.every((m: any) => m.state === 'delayed')).toBe(true);
      });

      it('supports pagination', async () => {
        const res = await request(BASE_URL).get(`/queues/${queueId}/messages?page=1&limit=1`);
        expect(res.status).toBe(200);
        expect(res.body.rows.length).toBeLessThanOrEqual(1);
      });
    });

    describe('GET /messages', () => {
      it('returns a global message search result', async () => {
        const res = await request(BASE_URL).get('/messages');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('rows');
        expect(res.body).toHaveProperty('totalCount');
      });

      it('supports state filter', async () => {
        const res = await request(BASE_URL).get('/messages?state=pending');
        expect(res.status).toBe(200);
        expect(res.body.rows.every((m: any) => m.state === 'pending')).toBe(true);
      });
    });

    describe('PATCH /messages/:messageId', () => {
      it('modifies a pending message', async () => {
        const res = await request(BASE_URL)
          .patch(`/messages/${pendingMessageId}`)
          .send({ priority: 10 })
          .set('Content-Type', 'application/json');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('priority', 10);
      });

      it('returns 404 for a nonexistent message', async () => {
        const res = await request(BASE_URL)
          .patch('/messages/9999999')
          .send({ priority: 1 })
          .set('Content-Type', 'application/json');

        expect(res.status).toBe(404);
      });
    });

    describe('GET /queues/:queueId/messages/next', () => {
      it('claims the next pending message (sets it in_progress)', async () => {
        const res = await request(BASE_URL).get(`/queues/${queueId}/messages/next`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('state', 'in_progress');
        inProgressMessageId = res.body.id;
      });

      it('returns 404 when no messages are available', async () => {
        // Drain remaining pending messages so the queue is empty
        let drained = false;
        while (!drained) {
          const r = await request(BASE_URL).get(`/queues/${queueId}/messages/next`);
          if (r.status === 404) drained = true;
        }
        const res = await request(BASE_URL).get(`/queues/${queueId}/messages/next`);
        expect(res.status).toBe(404);
      });
    });

    describe('GET /queues/:queueId/messages/next (long polling)', () => {
      it('returns 404 after timeout when queue stays empty', async () => {
        const start = Date.now();
        const res = await request(BASE_URL)
          .get(`/queues/${queueId}/messages/next?waitTimeMs=500`)
          .timeout(3000);
        expect(res.status).toBe(204);
        expect(Date.now() - start).toBeGreaterThanOrEqual(400);
      }, 5000);

      it('resolves immediately when a message is enqueued during the wait', async () => {
        const pollPromise = request(BASE_URL)
          .get(`/queues/${queueId}/messages/next?waitTimeMs=3000`)
          .timeout(5000);

        // Give the poll a moment to register before enqueuing
        await new Promise(resolve => setTimeout(resolve, 150));

        await request(BASE_URL)
          .post(`/queues/${queueId}/messages`)
          .send({ content: { wake: 'up' } })
          .set('Content-Type', 'application/json');

        const res = await pollPromise;
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('state', 'in_progress');
      }, 8000);
    });

    describe('POST /messages/:messageId/requeue', () => {
      it('requeues an in-progress message back to pending', async () => {
        const res = await request(BASE_URL).post(`/messages/${inProgressMessageId}/requeue`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true });
      });

      it('returns 404 for a message not in progress', async () => {
        const res = await request(BASE_URL).post('/messages/9999999/requeue');
        expect(res.status).toBe(404);
      });
    });

    describe('POST /messages/:messageId/ack', () => {
      it('acknowledges an in-progress message (deletes it)', async () => {
        // Re-claim the requeued message
        const nextRes = await request(BASE_URL).get(`/queues/${queueId}/messages/next`);
        expect(nextRes.status).toBe(200);
        const id = nextRes.body.id;

        const res = await request(BASE_URL).post(`/messages/${id}/ack`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true });
      });

      it('returns 404 for a message not in progress', async () => {
        const res = await request(BASE_URL).post('/messages/9999999/ack');
        expect(res.status).toBe(404);
      });
    });

    describe('DELETE /messages/:messageId', () => {
      it('deletes a pending message', async () => {
        const putRes = await request(BASE_URL)
          .post(`/queues/${queueId}/messages`)
          .send({ content: { to: 'delete' } })
          .set('Content-Type', 'application/json');
        const id = putRes.body.id;

        const res = await request(BASE_URL).delete(`/messages/${id}`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true });
      });

      it('returns 404 for a nonexistent message', async () => {
        const res = await request(BASE_URL).delete('/messages/9999999');
        expect(res.status).toBe(404);
      });
    });

    describe('POST /messages/:messageId/deadletter', () => {
      it('moves an in-progress message to dead_letter', async () => {
        const putRes = await request(BASE_URL)
          .post(`/queues/${queueId}/messages`)
          .send({ content: { fate: 'dead_letter' } })
          .set('Content-Type', 'application/json');
        const msgId = putRes.body.id;

        // Claim it
        await request(BASE_URL).get(`/queues/${queueId}/messages/next`);

        const res = await request(BASE_URL).post(`/messages/${msgId}/deadletter`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true });
      });

      it('returns 404 for a nonexistent message', async () => {
        const res = await request(BASE_URL).post('/messages/9999999/deadletter');
        expect(res.status).toBe(404);
      });
    });

    describe('GET /queues/:queueId/:groupId/messages/next', () => {
      it('returns 404 or 200 for a group-scoped next message', async () => {
        await request(BASE_URL)
          .post(`/queues/${queueId}/messages`)
          .send({ content: { group: 'test' }, group_id: '1' })
          .set('Content-Type', 'application/json');

        const res = await request(BASE_URL).get(`/queues/${queueId}/1/messages/next`);
        expect([200, 404]).toContain(res.status);
      });
    });

    describe('DELETE /messages/bulk', () => {
      it('bulk deletes messages by IDs', async () => {
        const r1 = await request(BASE_URL)
          .post(`/queues/${queueId}/messages`)
          .send({ content: { tag: 'bulk1' } })
          .set('Content-Type', 'application/json');
        const r2 = await request(BASE_URL)
          .post(`/queues/${queueId}/messages`)
          .send({ content: { tag: 'bulk2' } })
          .set('Content-Type', 'application/json');

        const res = await request(BASE_URL)
          .delete('/messages/bulk')
          .send({ ids: [r1.body.id, r2.body.id] })
          .set('Content-Type', 'application/json');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('deletedCount', 2);
      });

      it('returns 400 when ids array is empty', async () => {
        const res = await request(BASE_URL)
          .delete('/messages/bulk')
          .send({ ids: [] })
          .set('Content-Type', 'application/json');

        expect(res.status).toBe(400);
      });
    });
  });

  // ── Queue management (purge / delete) ───────────────────────────────────────

  describe('Queue purge and delete endpoints', () => {
    describe('POST /queues/purge', () => {
      it('purges all messages from queues', async () => {
        const res = await request(BASE_URL)
          .post('/queues/purge')
          .send({ ids: [queueId] })
          .set('Content-Type', 'application/json');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('purgeCount');
      });

      it('returns 400 when ids array is empty', async () => {
        const res = await request(BASE_URL)
          .post('/queues/purge')
          .send({ ids: [] })
          .set('Content-Type', 'application/json');

        expect(res.status).toBe(400);
      });
    });

    describe('DELETE /queues (by IDs)', () => {
      it('deletes queues by ID array', async () => {
        const createRes = await request(BASE_URL)
          .post('/queues')
          .send({ name: 'narq_test_delete_by_id' })
          .set('Content-Type', 'application/json');
        const id = createRes.body.id;

        const res = await request(BASE_URL)
          .delete('/queues')
          .send({ ids: [id] })
          .set('Content-Type', 'application/json');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('deletedCount');
      });

      it('returns 400 when ids array is empty', async () => {
        const res = await request(BASE_URL)
          .delete('/queues')
          .send({ ids: [] })
          .set('Content-Type', 'application/json');

        expect(res.status).toBe(400);
      });
    });

    describe('DELETE /queues/:name', () => {
      it('deletes a queue by name', async () => {
        const res = await request(BASE_URL).delete(`/queues/${TEST_QUEUE_NAME}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
      });
    });
  });
});
