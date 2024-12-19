import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getQueue, getMessagesForQueue } from '../services/queueService';
import {
  Container,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Box,
  CircularProgress,
  Tabs,
  Tab,
  Paper
} from '@mui/material';

interface Queue {
  id: number;
  name: string;
  config?: any;
  // Add other fields as needed
}

interface Message {
  id: number;
  content: any;
  state: string;
  priority: number;
  group_id?: string;
  created_at: string;
  // Add other fields as needed
}

function QueueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queueId = Number(id);
  
  const [queue, setQueue] = useState<Queue | null>(null);
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
  const [inFlightMessages, setInFlightMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0); // For switching between pending and in-flight tables

  useEffect(() => {
    async function fetchData() {
      try {
        const [q, pending, inFlight] = await Promise.all([
          getQueue(queueId),
          getMessagesForQueue(queueId, { state: 'pending' }),
          getMessagesForQueue(queueId, { state: 'in_progress' })
        ]);
        setQueue(q);
        setPendingMessages(pending);
        setInFlightMessages(inFlight);
      } catch (err) {
        console.error('Error fetching queue detail:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [queueId]);

  if (loading) {
    return (
      <Container sx={{ mt: 4 }}>
        <Box display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!queue) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography variant="h6" color="error">Queue not found</Typography>
      </Container>
    );
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const renderMessagesTable = (messages: Message[], title: string) => (
    <Paper sx={{ mt: 2, p: 2 }}>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>State</TableCell>
            <TableCell>Priority</TableCell>
            <TableCell>Group ID</TableCell>
            <TableCell>Created At</TableCell>
            <TableCell>Content</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {messages.map(msg => (
            <TableRow key={msg.id}>
              <TableCell>{msg.id}</TableCell>
              <TableCell>{msg.state}</TableCell>
              <TableCell>{msg.priority}</TableCell>
              <TableCell>{msg.group_id || '-'}</TableCell>
              <TableCell>{new Date(msg.created_at).toLocaleString()}</TableCell>
              <TableCell>{JSON.stringify(msg.content)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>{queue.name}</Typography>
      {queue.config && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1">Queue Configuration:</Typography>
          <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
            {JSON.stringify(queue.config, null, 2)}
          </pre>
        </Paper>
      )}

      <Tabs value={tabValue} onChange={handleTabChange}>
        <Tab label={`Pending (${pendingMessages.length})`} />
        <Tab label={`In-Flight (${inFlightMessages.length})`} />
      </Tabs>

      {tabValue === 0 && renderMessagesTable(pendingMessages, 'Pending Messages')}
      {tabValue === 1 && renderMessagesTable(inFlightMessages, 'In-Flight Messages')}
    </Container>
  );
}

export default QueueDetailPage;
