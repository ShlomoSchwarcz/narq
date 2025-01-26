import { Pool } from "pg";
import { MessageStatus } from "./types";

export class TimerThread {
    constructor(private readonly pool: Pool) { }

    async moveToDeadLetter () {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const sql = `SELECT * FROM messages WHERE EXTRACT(EPOCH FROM (NOW() - process_start)) > max_process_time AND state='${MessageStatus.in_progress}' AND attempts >= max_attempts FOR UPDATE`;
            const lockResult = await client.query(sql);

              if (lockResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return false;
              }

              console.log(`Found ${lockResult?.rows?.length} expired rows`);

            const updateResult = await client.query(
                `UPDATE messages
                SET state = '${MessageStatus.dead_letter}', updated_at = NOW() 
                WHERE EXTRACT(EPOCH FROM (NOW() - process_start)) > max_process_time AND state='${MessageStatus.in_progress}' AND attempts >= max_attempts`
                );

            await client.query('COMMIT');
            } 
        catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async releaseDelayedMessages() {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const sql = `SELECT * FROM messages WHERE ready_at <= NOW() AND state='${MessageStatus.delayed}' FOR UPDATE`;
            const lockResult = await client.query(sql);

              if (lockResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return false;
              }

              console.log(`Found ${lockResult?.rows?.length} delayed rows`);

            const updateResult = await client.query(
                `UPDATE messages
                SET state = '${MessageStatus.pending}', updated_at = NOW() 
                WHERE ready_at <= NOW() AND state='${MessageStatus.delayed}'`
                );

            await client.query('COMMIT');
            } 
        catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async retryExpiredMessage() {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const sql = `SELECT * FROM messages where EXTRACT(EPOCH FROM (NOW() - process_start)) > max_process_time AND state='${MessageStatus.in_progress}' AND attempts <= max_attempts FOR UPDATE`;
            const lockResult = await client.query(sql);

              if (lockResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return false;
              }

              console.log(`Found ${lockResult?.rows?.length} expired rows`);

            const updateResult = await client.query(
                `UPDATE messages
                SET state = '${MessageStatus.pending}', updated_at = NOW(), attempts=attempts+1
                where EXTRACT(EPOCH FROM (NOW() - process_start)) > max_process_time and attempts <= max_attempts`
                );

            await client.query('COMMIT');
            } 
        catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async run() {
        await Promise.all([
            this.retryExpiredMessage(),
            this.releaseDelayedMessages(),
            this.moveToDeadLetter(),
            new Promise(resolve => setTimeout(resolve, 1000))
        ]);
    }
}