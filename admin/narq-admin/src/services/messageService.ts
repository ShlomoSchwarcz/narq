import { GridSortDirection } from '@mui/x-data-grid';
import axios from 'axios';

const API_BASE = 'http://localhost:3000'; //process?.env?.REACT_APP_API_BASE || 'http://localhost:3000';

export async function getMessagesPaginated(
  queueId: number,
  page: number,
  limit: number,
  sortField?: string,
  sortOrder?: GridSortDirection
) {
  const params: any = {
    page,
    limit,
  };
  if (sortField) params.sortField = sortField;
  if (sortOrder) params.sortOrder = sortOrder;

  const res = await axios.get(`${API_BASE}/queues/${queueId}/messages`, { params });
  return res.data;
}

export async function getAllMessagesPaginated(
  page: number,
  limit: number,
  sortField?: string,
  sortOrder?: GridSortDirection
) {
  const params: any = {
    page,
    limit,
  };
  if (sortField) params.sortField = sortField;
  if (sortOrder) params.sortOrder = sortOrder;

  const res = await axios.get(`${API_BASE}/messages`, { params });
  return res.data;
}

export async function deleteMessages(ids: number[]): Promise<void> {
  await axios.delete(`${API_BASE}/messages/bulk`, {
    data: { ids },
  });
}
