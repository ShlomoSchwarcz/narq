import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Import pages
// import ConfigurationPage from './pages/ConfigurationPage';
// import StatsDashboard from './pages/StatsDashboard';
import QueuesPage from './pages/QueuesPage';
import QueueDetailPage from './pages/QueueDetailPage';
// import MessageDetailPage from './pages/MessageDetailPage';

const theme = createTheme({
  // Customize the MUI theme if needed
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        {/* Navigation bar or side menu component here */}
        <Routes>
          <Route path="/" element={<Navigate to="/stats" replace />} />
          {/* <Route path="/configuration" element={<ConfigurationPage />} /> */}
          {/* <Route path="/stats" element={<StatsDashboard />} /> */}
          <Route path="/queues" element={<QueuesPage />} />
          <Route path="/queues/:id" element={<QueueDetailPage />} />
          {/* <Route path="/messages/:id" element={<MessageDetailPage />} /> */}
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
