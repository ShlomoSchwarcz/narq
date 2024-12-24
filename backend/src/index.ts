import Fastify from 'fastify';
import { Pool } from 'pg';
import { QueueRepository } from './repoistory.service';
import queueRoutes from './queues.router';
import messageRoutes from './messages.router';
import { MessageListener } from './polling.service';
import cors from '@fastify/cors'

const fastify = Fastify({ logger: true });

// Create your PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Create an instance of the repository
const repo = new QueueRepository(pool);

// Register routes with the repository as the option
fastify.register(queueRoutes, { repo });
fastify.register(messageRoutes, { repo });
fastify.register(cors, {
    origin:'*',
  })


MessageListener.startMessageListener(repo);

// async function load() {
//     for (let i=0; i<120; i++) {
//         await repo.putMessage(12, {msg: 'test message ' + i});
//     }
// }

// load();

// Start the server
fastify.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`Server listening at ${address}`);
});

