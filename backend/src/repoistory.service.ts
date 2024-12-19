import { Pool } from 'pg';
import { Message, Queue } from './types';

export class QueueRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async putMessage(queueId: number, content: any, options: {
    priority?: number;
    group_id?: string;
    ready_at?: Date;
    max_attempts?: number;
    delay_after_processing?: number;
  } = {}): Promise<Message> {
    const {
      priority = 0,
      group_id = null,
      ready_at = new Date(),
      max_attempts = 5,
      delay_after_processing = 0
    } = options;

    const result = await this.pool.query(
      `INSERT INTO messages (queue_id, content, priority, group_id, ready_at, max_attempts, delay_after_processing)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [queueId, content, priority, group_id, ready_at, max_attempts, delay_after_processing]
    );
    return result.rows[0];
  }


  async getMessage(queueId: number): Promise<Message | null> {
    // Begin a transaction if your code structure allows it.
    // If using pg.Pool, you might do:
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
  
      const result = await client.query(
        `
        WITH next_msg AS (
          SELECT id
          FROM messages
          WHERE queue_id = $1
            AND state = 'pending'
            AND ready_at <= NOW()
          ORDER BY priority ASC, created_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        UPDATE messages
        SET state = 'in_progress', updated_at = NOW()
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

  async searchMessages(queueId: number, criteria: { state?: string; group_id?: string; priority?: number }): Promise<Message[]> {
    const conditions: string[] = ['queue_id = $1'];
    const values: any[] = [queueId];
    let idx = 2;

    if (criteria.state) {
      conditions.push(`state = $${idx++}`);
      values.push(criteria.state);
    }

    if (criteria.group_id) {
      conditions.push(`group_id = $${idx++}`);
      values.push(criteria.group_id);
    }

    if (criteria.priority !== undefined) {
      conditions.push(`priority = $${idx++}`);
      values.push(criteria.priority);
    }

    const sql = `
      SELECT * FROM messages
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at ASC
    `;

    const result = await this.pool.query(sql, values);
    return result.rows;
  }

  async acknowledgeMessage(messageId: number): Promise<boolean> {
    return this.deleteMessage(messageId);
  }

  async deleteMessage(messageId: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const deleteResult = await client.query(
        `DELETE FROM messages WHERE id = $1`,
        [messageId]
      );
      return deleteResult.rowCount > 0;
    } catch (err) {
      throw err;
    }
  }

  async requeueMessage(messageId: number, incrementAttempt = true): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Lock the message row
      const lockResult = await client.query(
        `SELECT id, state, attempts FROM messages WHERE id = $1 FOR UPDATE`,
        [messageId]
      );

      if (lockResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      const { state, attempts } = lockResult.rows[0];
      if (state !== 'in_progress') {
        await client.query('ROLLBACK');
        return false;
      }

      const newAttempts = incrementAttempt ? attempts + 1 : attempts;

      const updateResult = await client.query(
        `UPDATE messages
         SET state = 'pending', updated_at = NOW(), ready_at = NOW(), attempts = $2
         WHERE id = $1
         RETURNING *`,
        [messageId, newAttempts]
      );

      await client.query('COMMIT');
      return updateResult.rowCount > 0;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  
  /** Move a message to the dead-letter queue */
  async moveToDeadLetter(messageId: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Lock the message row
      const lockResult = await client.query(
        `SELECT id FROM messages WHERE id = $1 FOR UPDATE`,
        [messageId]
      );

      if (lockResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      const updateResult = await client.query(
        `UPDATE messages
         SET state = 'dead_letter', updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [messageId]
      );

      await client.query('COMMIT');
      return updateResult.rowCount > 0;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /** Modify a pending message (lock, check state, update) */
  async modifyMessage(messageId: number, updates: Partial<{ content: any; priority?: number; ready_at?: Date; max_attempts?: number; delay_after_processing?: number }>): Promise<any> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Lock the message row
      const lockResult = await client.query(
        `SELECT id, state FROM messages WHERE id = $1 FOR UPDATE`,
        [messageId]
      );

      if (lockResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const { state } = lockResult.rows[0];
      if (state !== 'pending') {
        await client.query('ROLLBACK');
        return null;
      }

      const setClauses: string[] = [];
      const values: any[] = [];
      let index = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (['content', 'priority', 'ready_at', 'max_attempts', 'delay_after_processing'].includes(key)) {
          setClauses.push(`${key} = $${index++}`);
          values.push(value);
        }
      }

      if (setClauses.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      values.push(messageId);

      const sql = `
        UPDATE messages
        SET ${setClauses.join(', ')}, updated_at = NOW()
        WHERE id = $${index}
        RETURNING *
      `;

      const updateResult = await client.query(sql, values);
      await client.query('COMMIT');
      return updateResult.rows[0] || null;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async createQueue(name: string, config: any = {}): Promise<Queue> {
    const result = await this.pool.query(
      `INSERT INTO queues (name, config) VALUES ($1, $2) RETURNING *`,
      [name, config]
    );
    return result.rows[0];
  }

  async getQueueByName(name: string): Promise<Queue | null> {
    const result = await this.pool.query(
      `SELECT * FROM queues WHERE name = $1`,
      [name]
    );
    return result.rows[0] || null;
  }

  async getQueuesPaginated(page: number, limit: number, sortField?: string, sortOrder?: 'asc' | 'desc') {
    const offset = (page - 1) * limit;
  
    const orderBy = (sortField && sortOrder) ? ` ORDER BY ${sortField} ${sortOrder} ` : '';

    // Use the JOIN and GROUP BY approach for efficiency:
    const rowsResult = await this.pool.query(
      `
      SELECT q.id,
             q.name,
             q.config,
             q.created_at,
             q.updated_at,
             COUNT(m.id) AS messages_count
      FROM queues q
      LEFT JOIN messages m ON m.queue_id = q.id
      GROUP BY q.id, q.name, q.config, q.created_at, q.updated_at
      ${orderBy}
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );
  
    const countResult = await this.pool.query(`SELECT COUNT(*) AS total FROM queues`);
    const totalCount = parseInt(countResult.rows[0].total, 10);
  
    return { rows: rowsResult.rows, totalCount };
  }
  

  // async getQueuesPaginated(page: number, limit: number, sortField?: string, sortOrder?: string): Promise<{ rows: any[]; totalCount: number }> {
  //   const offset = (page - 1) * limit;
  

  //   const orderBy = (sortField && sortOrder) ? ` ORDER BY ${sortField} ${sortOrder} ` : '';
  //   // Query to get the rows
  //   const rowsResult = await this.pool.query(
  //     `SELECT *, COUNT(m.id) as messageCount FROM queues
  //      ${orderBy}
  //      LEFT JOIN messages m ON messages.queue_id = queues.id
  //      GROUP BY queue.id
  //      LIMIT $1 OFFSET $2`,
  //     [limit, offset]
  //   );
  
  //   // Query to get the total count of queues
  //   const countResult = await this.pool.query(`SELECT COUNT(*) AS total FROM queues`);
  
  //   const totalCount = parseInt(countResult.rows[0].total, 10);
  
  //   return {
  //     rows: rowsResult.rows,
  //     totalCount
  //   };
  // }  

}
