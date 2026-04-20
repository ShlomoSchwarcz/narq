import { FastifyReply } from 'fastify';
import { Pool } from 'pg';
import { QueueRepository } from './repoistory.service';

export class MessageListener {

    constructor(private readonly repo: QueueRepository) {
    }

    public static startMessageListener(repo: QueueRepository): MessageListener {
        const listner = new MessageListener(repo);
        listner.init();
        return listner;
    }

    public static MAX_WAITING_TIME = 2 * 60 * 60;

    private waitingRequests = new Map<number, { reply: FastifyReply; timeout: NodeJS.Timeout }[]>();

    async init(){
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        
        (async () => {
          const client = await pool.connect();
          await client.query('LISTEN new_message');
        
          client.on('notification', async (msg) => {
            if (msg.channel === 'new_message') {
              const queueId = parseInt(msg.payload, 10);
              if (!isNaN(queueId)) {
                this.fulfillLongPollRequest(queueId, this.repo);    // No await, do these async
              }
            }
          });
        })();
    }

    storeLongPollRequest(queueId: number, reply: FastifyReply, timeoutMs: number = 120000) {
        const timeoutId = setTimeout(() => {
          const queue = this.waitingRequests.get(queueId);
          if (queue) {
            const idx = queue.findIndex(r => r.reply === reply);
            if (idx >= 0) {
              queue.splice(idx, 1);
              if (queue.length === 0) this.waitingRequests.delete(queueId);
            }
          }
          reply.status(204).send();
        }, timeoutMs);

        if (!this.waitingRequests.has(queueId)) {
          this.waitingRequests.set(queueId, []);
        }
        this.waitingRequests.get(queueId)!.push({ reply, timeout: timeoutId });
    }

    async fulfillLongPollRequest(queueId: number, repo: QueueRepository) {
        const requests = this.waitingRequests.get(queueId);
        if (!requests || requests.length === 0) return;

        const message = await repo.getMessage(queueId);
        if (message) {
          const { reply, timeout } = requests.shift()!;
          clearTimeout(timeout);
          reply.send(message);
          if (requests.length === 0) this.waitingRequests.delete(queueId);
        }
    }
}