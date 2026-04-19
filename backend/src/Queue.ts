import { Pool } from "pg";
import { Message, MessageStatus, QueueType } from "./types";



export abstract class AbstractQueueApi {
    constructor(protected readonly pool: Pool) { }
    abstract getMessage(queueId: number, groupId?: number): Promise<Message | null>;
    static getInstance(pool: Pool, queueType: string) {
        switch (queueType) {
            case QueueType.fifo:
                return new FifoQueue(pool);

            case QueueType.unlimited:
                return new UnlimitedQueue(pool);

            default:
                return new UnlimitedQueue(pool);
        }
    }
}

export class FifoQueue extends AbstractQueueApi {
    async getMessage(queueId: number, groupId?: number): Promise<Message | null> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const groupCond = groupId ? ` AND group_id = ${groupId} ` : '';
            const result = await client.query(
                `
                WITH next_msg AS (
                SELECT msg.id, msg.group_id, msg.state FROM (SELECT 
                        COUNT(CASE WHEN m.state='in_progress' THEN 1 END) AS progress,
                        m.group_id
                FROM messages m
                LEFT JOIN queues q ON m.queue_id = q.id
                    WHERE q.id = $1 ${groupCond}
                GROUP BY m.group_id) AS groups
                LEFT JOIN 
                (SELECT * FROM messages WHERE state='pending' AND queue_id=$1 ${groupCond} FOR UPDATE SKIP LOCKED)  AS msg
                ON msg.group_id = groups.group_id 
                WHERE groups.progress = 0
                ORDER BY msg.priority ASC, msg.created_at ASC LIMIT 1

                UPDATE messages
                SET state = '${MessageStatus.in_progress}', updated_at = NOW(), process_start = NOW()
                FROM next_msg
                WHERE messages.id = next_msg.id
                RETURNING messages.*;
                `,
                [queueId]
            );

            await client.query('COMMIT');
            return result.rows[0] || null;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }
}

export class UnlimitedQueue extends AbstractQueueApi {
    async getMessage(queueId: number, groupId?: number): Promise<Message | null> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const groupCond = groupId ? ` AND group_id = ${groupId} ` : '';
            const result = await client.query(
                `
                WITH next_msg AS (
                SELECT id
                FROM messages
                WHERE queue_id = $1
                    AND state = '${MessageStatus.pending}'
                    AND ready_at <= NOW()
                    ${groupCond}
                ORDER BY priority ASC, created_at ASC
                LIMIT 1
                FOR UPDATE SKIP LOCKED
                )
                UPDATE messages
                SET state = '${MessageStatus.in_progress}', updated_at = NOW(), process_start = NOW()
                FROM next_msg
                WHERE messages.id = next_msg.id
                RETURNING messages.*;
                `,
                [queueId]
            );

            await client.query('COMMIT');

            return result.rows[0] || null;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }
}