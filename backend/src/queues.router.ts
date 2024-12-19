import { FastifyPluginAsync } from 'fastify';
import { QueueRepository } from './repoistory.service';
import { MAX_NUMBER_OF_ROWS } from './types';

interface CreateQueueBody {
  name: string;
  config?: any;
}

const queueRoutes: FastifyPluginAsync<{ repo: QueueRepository }> = async (fastify, opts) => {
  const { repo } = opts;

  // POST /queues - Create a new queue
  fastify.post<{ Body: CreateQueueBody }>('/queues', async (request, reply) => {
    const { name, config } = request.body;
    const queue = await repo.createQueue(name, config);
    return queue;
  });

  // GET /queues/:name - Get queue by name
  fastify.get('/queues/:name', async (request, reply) => {
    const { name } = request.params as { name: string };
    const queue = await repo.getQueueByName(name);
    if (!queue) {
      return reply.status(404).send({ error: 'Queue not found' });
    }
    return queue;
  });

  fastify.get('/queues', async (request, reply) => {
    const queue = await repo.getQueuesPaginated(1, MAX_NUMBER_OF_ROWS);
    if (!queue) {
      return reply.status(404).send({ error: 'Queue not found' });
    }
    return queue;
  });

  fastify.get('/queues/page', async (request, reply) => {
    // const { page } = request.query as { page: number };
    // const { limit } = request.query as { limit?: number } ;
    const { page = '1', limit = '10', sortField, sortOrder } = request.query as {
      page?: string;
      limit?: string;
      sortField?: string;
      sortOrder?: 'asc' | 'desc';
    };
    const queue = await repo.getQueuesPaginated(parseInt(page), parseInt(limit), sortField, sortOrder);
    if (!queue) {
      return reply.status(404).send({ error: 'Queue not found' });
    }
    return queue;
  });

};

export default queueRoutes;