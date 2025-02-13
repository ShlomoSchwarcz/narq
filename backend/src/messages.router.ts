import { FastifyPluginAsync } from 'fastify';
import { QueueRepository } from './repoistory.service';

export interface PutMessageBody {
  content: any;
  priority?: number;
  group_id?: string;
  ready_at?: string; // ISO date string, convert to Date
  max_attempts?: number;
  delay_after_processing?: number;
}

export interface SearchQuery {
  state?: string;
  group_id?: string;
  priority?: string;
  page?: number,
  limit?: number,
  sortField?: string,
  sortOrder?: string
}

const messageRoutes: FastifyPluginAsync<{ repo: QueueRepository }> = async (fastify, opts) => {
  const { repo } = opts;

  // POST /queues/:queueId/messages - Put a message in a queue
  fastify.post<{ Params: { queueId: string }, Body: PutMessageBody }>('/queues/:queueId/messages', async (request, reply) => {
    const queueId = parseInt(request.params.queueId, 10);
    const { content, priority, group_id, ready_at, max_attempts, delay_after_processing } = request.body;

    const message = await repo.putMessage(queueId, content, {
      priority,
      group_id,
      ready_at: ready_at ? new Date(ready_at) : undefined,
      max_attempts,
      delay_after_processing
    });

    return message;
  });

  // GET /queues/:queueId/messages/next - Get the next message from a queue
  fastify.get<{ Params: { queueId: string }, Querystring: {delete?: boolean} }>('/queues/:queueId/messages/next', async (request, reply) => {
    const queueId = parseInt(request.params.queueId, 10);
    const message = await repo.getMessage(queueId);
    if (request.query.delete) {
      await repo.deleteMessage(message.id);
    }
    if (!message) {
      return reply.status(404).send({ error: 'No available messages' });
    }
    return message;
  });

  // GET /queues/:queueId/:groupId/messages/next - Get the next message from a queue
  fastify.get<{ Params: { queueId: string, groupId: string }, Querystring: {delete?: boolean}  }>('/queues/:queueId/:groupId/messages/next', async (request, reply) => {
    const queueId = parseInt(request.params.queueId, 10);
    const groupId = parseInt(request.params.groupId, 10);
    const message = await repo.getMessage(queueId, groupId);
    if (request.query.delete) {
      await repo.deleteMessage(message.id);
    }
    if (!message) {
      return reply.status(404).send({ error: 'No available messages' });
    }
    return message;
  });

  // DELETE /messages/:messageId - Delete a pending message
  fastify.delete<{ Params: { messageId: string } }>('/messages/:messageId', async (request, reply) => {
    const messageId = parseInt(request.params.messageId, 10);
    const deleted = await repo.deleteMessage(messageId);
    if (!deleted) {
      return reply.status(404).send({ error: 'Message not found or not pending' });
    }
    return { success: true };
  });

  // POST /messages/:messageId/ack - Acknowledge a message as processed
  fastify.post<{ Params: { messageId: string } }>('/messages/:messageId/ack', async (request, reply) => {
    const messageId = parseInt(request.params.messageId, 10);
    const acked = await repo.acknowledgeMessage(messageId);
    if (!acked) {
      return reply.status(404).send({ error: 'Message not found or not in progress' });
    }
    return { success: true };
  });

  // POST /messages/:messageId/requeue - Requeue a message (in_progress -> pending)
  fastify.post<{ Params: { messageId: string } }>('/messages/:messageId/requeue', async (request, reply) => {
    const messageId = parseInt(request.params.messageId, 10);
    const requeued = await repo.requeueMessage(messageId);
    if (!requeued) {
      return reply.status(404).send({ error: 'Message not found or not in progress' });
    }
    return { success: true };
  });

  // POST /messages/:messageId/deadletter - Move a message to dead_letter
  fastify.post<{ Params: { messageId: string } }>('/messages/:messageId/deadletter', async (request, reply) => {
    const messageId = parseInt(request.params.messageId, 10);
    const moved = await repo.moveToDeadLetter(messageId);
    if (!moved) {
      return reply.status(404).send({ error: 'Message not found' });
    }
    return { success: true };
  });

  // PATCH /messages/:messageId - Modify a pending message
  fastify.patch<{ Params: { messageId: string }, Body: Partial<PutMessageBody> }>('/messages/:messageId', async (request, reply) => {
    const messageId = parseInt(request.params.messageId, 10);
    const updates: any = { ...request.body };
    if (updates.ready_at) updates.ready_at = new Date(updates.ready_at);

    const updatedMessage = await repo.modifyMessage(messageId, updates);
    if (!updatedMessage) {
      return reply.status(404).send({ error: 'Message not found or not pending' });
    }
    return updatedMessage;
  });

  // GET /queues/:queueId/messages - Search for messages
  // Example query: /queues/1/messages?state=pending&group_id=abc&priority=10
  fastify.get<{ Params: { queueId: string }, Querystring: SearchQuery }>('/queues/:queueId/messages', async (request, reply) => {
    const queueId = parseInt(request.params.queueId, 10);
    const messages = await repo.searchMessages(queueId, request.query);
    return messages;
  });


  fastify.get<{ Params: { queueId: string }, Querystring: SearchQuery }>('/messages', async (request, reply) => {
    const { state, group_id, priority, page, limit } = request.query;
    const messages = await repo.searchMessages(-1, request.query);
    return messages;
  });

  fastify.delete('/messages/bulk', async (request, reply) => {
    const { ids } = request.body as { ids: number[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.status(400).send({ error: 'No IDs provided' });
    }

    try {
      const deletedCount = await repo.deleteMessages(ids);
      return { success: true, deletedCount };
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to delete messages' });
    }
  });  
};

export default messageRoutes;
