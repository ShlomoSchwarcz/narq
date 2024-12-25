import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom'; // to read :queueId
import { DataGrid, GridColDef, GridSortModel, GridRowSelectionModel, GridSortDirection } from '@mui/x-data-grid';
import { Box, Typography, Button, Stack } from '@mui/material';
import dayjs from 'dayjs';
import { deleteMessages, getMessagesPaginated } from '../services/messageService';

interface Message {
  id: number;
  content: string;
  state: string;
  created_at: string;
  updated_at: string;
  // ... add other fields as needed
}

export default function MessagesPage() {
  const { queueId } = useParams<{ queueId: string }>();
  const qId = parseInt(queueId || '0', 10);

  // Data
  const [rows, setRows] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [rowCount, setRowCount] = useState(0);

  // Pagination
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

  // Sorting
  const [sortModel, setSortModel] = useState<GridSortModel>([]);

  // Selection
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>([]);

  useEffect(() => {
    if (!qId) return;

    let isActive = true;
    (async () => {
      setLoading(true);
      try {
        // DataGrid uses zero-based for page; server might be one-based
        const page = paginationModel.page + 1;
        const limit = paginationModel.pageSize;

        let sortField: string | undefined;
        let sortOrder: GridSortDirection;
        if (sortModel.length > 0) {
          sortField = sortModel[0].field;
          sortOrder = sortModel[0].sort;
        }

        const data = await getMessagesPaginated(qId, page, limit, sortField, sortOrder);
        /*
          Expected response format:
          {
            data: [ { id, content, state, created_at, ... }, ... ],
            pagination: { page, limit, total, totalPages }
          }
        */
        if (!isActive) return;

        setRows(data.rows);
        setRowCount(data.totalCount);
      } catch (err) {
        console.error('Error fetching messages:', err);
      } finally {
        if (isActive) setLoading(false);
      }
    })();

    return () => { isActive = false; };
  }, [qId, paginationModel, sortModel]);

  const handleDelete = async () => {
    if (rowSelectionModel.length === 0) return;
    const messageIds = rowSelectionModel.map((id) => Number(id));
    
    try {
      await deleteMessages(messageIds);
      await fetchMessages();
    } catch (err) {
      console.error('Error deleting messages:', err);
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const page = paginationModel.page + 1; // DataGrid is zero-based
      const limit = paginationModel.pageSize;
      const sortField = sortModel[0]?.field;
      const sortOrder = sortModel[0]?.sort as 'asc' | 'desc' | undefined;

      const data = await getMessagesPaginated(qId, page, limit, sortField, sortOrder);
      setRows(data.rows);
      setRowCount(data.totalCount);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Columns
  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70, sortable: true },
    {
      field: 'content',
      headerName: 'Content',
      flex: 1,
      minWidth: 200,
      sortable: false,
      renderCell: (params) => {
        const text = JSON.stringify(params.value);
        // Truncate to 150 chars
        const truncated = text.length > 150 ? text.slice(0, 150) + '...' : text;
        return <span>{truncated}</span>;
      },
    },
    { field: 'state', headerName: 'State', width: 120, sortable: true },
    {
      field: 'created_at',
      headerName: 'Created At',
      width: 180,
      sortable: true,
      valueFormatter: (params) => dayjs(params as string).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      field: 'updated_at',
      headerName: 'Updated At',
      width: 180,
      sortable: true,
      valueFormatter: (params) => dayjs(params as string).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  const handleEdit = () => {
    // For editing, you might open a modal to edit the content of each selected message.
    console.log('Edit messages with IDs:', rowSelectionModel);
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%',
        width: '100%',
      }}
    >
            <Typography variant="h4" gutterBottom>
        Messages for Queue #{qId}
      </Typography>

      {/* Action Buttons */}
      <Stack direction="row" spacing={2} mb={2}>
        <Button
          variant="contained"
          color="error"
          disabled={rowSelectionModel.length === 0}
          onClick={handleDelete}
        >
          Delete Message
        </Button>
        <Button
          variant="contained"
          disabled={rowSelectionModel.length === 0}
          onClick={handleEdit}
        >
          Edit Message
        </Button>
      </Stack>

      <DataGrid
        rows={rows}
        columns={columns}
        loading={loading}
        pagination
        paginationMode="server"
        rowCount={rowCount}
        paginationModel={paginationModel}
        onPaginationModelChange={(model) => setPaginationModel(model)}
        pageSizeOptions={[5, 10, 20, 50, 100]}

        sortingMode="server"
        sortModel={sortModel}
        onSortModelChange={(model) => setSortModel(model)}

        // Row selection
        checkboxSelection
        onRowSelectionModelChange={(newSelectionModel) => setRowSelectionModel(newSelectionModel)}
        rowSelectionModel={rowSelectionModel}

        // General config
        disableRowSelectionOnClick
        getRowId={(row) => row.id}
      />
    </Box>
  );
}
