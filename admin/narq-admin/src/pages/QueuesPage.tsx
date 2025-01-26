import { useEffect, useState } from 'react';
import { deleteQueues, getQueuesPaginated, purgeQueues } from '../services/queueService';
import { DataGrid, GridColDef, GridRowSelectionModel, GridSortModel } from '@mui/x-data-grid';
import { Box, Button, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';

interface Queue {
  id: number;
  name: string;
  config: any;
  created_at: string;
  updated_at: string;
}

export default function QueuesPage() {
  const [rows, setRows] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(false);
  const [rowCount, setRowCount] = useState(0);

  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });


    const handleDelete = async () => {
      if (rowSelectionModel.length === 0) return;
      const queueIds = rowSelectionModel.map((id) => Number(id));
      
      try {
        await deleteQueues(queueIds);
        await fetchQueues();
      } catch (err) {
        console.error('Error deleting messages:', err);
      }
    };

    const handlePurge = async () => {
      if (rowSelectionModel.length === 0) return;
      const queueIds = rowSelectionModel.map((id) => Number(id));
      
      try {
        await purgeQueues(queueIds);
        await fetchQueues();
      } catch (err) {
        console.error('Error deleting messages:', err);
      }
    };

  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>([]);


  async function fetchQueues() {
    let isActive = true;
    setLoading(true);
    try {
      const sortField = sortModel[0]?.field;
      const sortOrder = sortModel[0]?.sort;
      // DataGrid's page is zero-based, backend page is one-based
      const data = await getQueuesPaginated(paginationModel.page + 1, paginationModel.pageSize, sortField, sortOrder);
      if (!isActive) return;
      setRows(data.rows);
      setRowCount(data.totalCount);
    } catch (err) {
      console.error('Error fetching queues:', err);
    } finally {
      if (isActive) setLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;
    (async () => {
      return fetchQueues();
    })();

    return () => {
      isActive = false;
    };
  }, [paginationModel.page, paginationModel.pageSize, sortModel]);

  const dateFormat = 'DD-MM-YYYY HH:mm:ss';
  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    {
      field: 'name',
      headerName: 'Name',
      width: 200,
      renderCell: (params) => (
        <Link
          to={`/queues/${params.row.id}/messages`}
        >
          {params.value}
        </Link>
      ),
    },
    {
      field: 'created_at',
      headerName: 'Created At',
      width: 180,
      valueFormatter: (params) => dayjs(params as string).format(dateFormat),
    },
    {
      field: 'updated_at',
      headerName: 'Updated At',
      width: 180,
      valueFormatter: (params) => dayjs(params as string).format(dateFormat),
    },
    { field: 'messages_count', headerName: 'Pending', width: 120, type: 'number' },
    { field: 'messages_progress', headerName: 'In Progress', width: 120, type: 'number' },
    { field: 'messages_delayed', headerName: 'Delayed', width: 120, type: 'number' },
    { field: 'messages_dead', headerName: 'Dead Letter', width: 120, type: 'number' },
  ];
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%',
        width: '100%',
      }}
    >

<Stack direction="row" spacing={2} mb={2}>
        <Button
          variant="contained"
          color="error"
          disabled={rowSelectionModel.length === 0}
          onClick={handleDelete}
        >
          Delete Queues
        </Button>

        <Button
          variant="contained"
          color="error"
          disabled={rowSelectionModel.length === 0}
          onClick={handlePurge}
        >
          Purge Queues
        </Button>
      </Stack>

      <Typography variant="h4" gutterBottom>
        List of Queues
      </Typography>
      <DataGrid
        rows={rows}
        columns={columns}
        loading={loading}
        pagination
        paginationMode="server"
        sortingMode="server"
        rowCount={rowCount}
        onSortModelChange={(model) => setSortModel(model)}
        sortModel={sortModel}
        onPaginationModelChange={(model) => setPaginationModel(model)}
        getRowId={(row) => row.id}
        checkboxSelection
        onRowSelectionModelChange={(newSelectionModel) => setRowSelectionModel(newSelectionModel)}
        pageSizeOptions={[10, 50, 100]}
      />
    </Box>
  );
}
