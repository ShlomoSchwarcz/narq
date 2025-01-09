import { GridSortDirection } from '@mui/x-data-grid';
import axios from 'axios';

const API_BASE = 'http://localhost:3000'; //process?.env?.REACT_APP_API_BASE || 'http://localhost:3000';

export async function getQueues() {
  const res = await axios.get(`${API_BASE}/queues`);
  return res.data;
}

export async function getQueue(queueId: number) {
  const res = await axios.get(`${API_BASE}/queues/${queueId}`);
  return res.data;
}


export async function getQueuesPaginated(page: number, limit: number, sortField: string, sortOrder: GridSortDirection) {
    const res = await axios.get(`${API_BASE}/queues/page`, {
      params: { page, limit, sortField, sortOrder }
    });
    return res.data; 
    // Expected format:
    // {
    //   data: [...queue records...],
    //   pagination: { page, limit, total, totalPages }
    // }
  }

export async function getMessagesForQueue(queueId: number, params: { state?: string } = {}) {
    const url = new URL(`${API_BASE}/queues/${queueId}/messages`);
    if (params.state) {
      url.searchParams.set('state', params.state);
    }
    const res = await axios.get(url.toString());
    return res.data;
  }

  export async function deleteQueues(ids: number[]): Promise<void> {
    await axios.delete(`${API_BASE}/queues`, {
      data: { ids },
    });
  }

  export async function purgeQueues(ids: number[]): Promise<void> {
    await axios.post(`${API_BASE}/queues/purge`, {
       ids,
    });
  }