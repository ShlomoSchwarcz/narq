import React, { useEffect, useState } from 'react';
import { getQueuesPaginated } from '../services/queueService';
import { DataGrid, GridColDef, GridSortModel } from '@mui/x-data-grid';
import { Box, Typography } from '@mui/material';
import dayjs from 'dayjs';

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

  const [sortModel, setSortModel] = useState<GridSortModel>([]);

  useEffect(() => {
    let isActive = true;
    (async () => {
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
    })();

    return () => {
      isActive = false;
    };
  }, [paginationModel.page, paginationModel.pageSize, sortModel]);

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', width: 200 },
    // {
    //   field: 'config',
    //   headerName: 'Config',
    //   width: 300,
    //   renderCell: (params) => (
    //     <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
    //       {JSON.stringify(params.value, null, 2)}
    //     </pre>
    //   ),
    // },
    {
      field: 'created_at',
      headerName: 'Created At',
      width: 180,
      valueFormatter: (params) => dayjs(params as string).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      field: 'updated_at',
      headerName: 'Updated At',
      width: 180,
      valueFormatter: (params) => dayjs(params as string).format('YYYY-MM-DD HH:mm:ss'),
    },
    { field: 'messages_count', headerName: 'Messages', width: 120, type: 'number' },
  ];
  
  return (
    <Box sx={{ height: 600, width: '100%', maxWidth: '1200px', mx: 'auto', p: 2, overflow: 'hidden' }}>
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
        pageSizeOptions={[10, 50, 100]}
      />
    </Box>
  );
}
