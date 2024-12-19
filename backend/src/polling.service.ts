import { FastifyReply } from 'fastify';
import { Pool } from 'pg';
import { QueueRepository } from './repoistory.service';

export class MessageListener {

    constructor(private readonly repo: QueueRepository) {
    }

    public static startMessageListener(repo: QueueRepository) {
        const listner = new MessageListener(repo);
        listner.init();
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
        // Create a timeout to handle the case where no message arrives in time
        const timeoutId = setTimeout(() => {
          // Timeout expired, remove request and respond with no messages
          const idx = this.waitingRequests[queueId]?.findIndex(r => r.reply === reply);
          if (idx !== undefined && idx >= 0) {
            this.waitingRequests[queueId].splice(idx, 1);
            if (this.waitingRequests[queueId].length === 0) {
              delete this.waitingRequests[queueId]; // clean up empty arrays
            }
          }
          reply.send({ error: 'No messages' });
        }, timeoutMs);
      
        if (!this.waitingRequests[queueId]) {
            this.waitingRequests[queueId] = [];
        }
        this.waitingRequests[queueId].push({ reply, timeoutId });
      }

      async fulfillLongPollRequest(queueId: number, repo: QueueRepository) {
        const requests = this.waitingRequests[queueId];
        if (!requests || requests.length === 0) return;
      
        // Attempt to fetch a message now that we know one is available.
        const message = await repo.getMessage(queueId);
        if (message) {
          // Fulfill one waiting request
          const { reply, timeoutId } = requests.shift()!;
          clearTimeout(timeoutId);
          reply.send(message);
          if (requests.length === 0) {
            delete this.waitingRequests[queueId];
          }
        }
    }
}