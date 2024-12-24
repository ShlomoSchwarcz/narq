import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Import pages
// import ConfigurationPage from './pages/ConfigurationPage';
// import StatsDashboard from './pages/StatsDashboard';
import QueuesPage from './pages/QueuesPage';
import QueueDetailPage from './pages/QueueDetailPage';
import MessagesPage from './pages/MessagePage';
import AppLayout from './layouts/AppLayout';
import AllMessagesPage from './pages/AllMessagesPage';
// import MessageDetailPage from './pages/MessageDetailPage';

const theme = createTheme({
  // Customize the MUI theme if needed
});

function App() {
  // return (
    // <ThemeProvider theme={theme}>
    //   <Router>
    //     {/* Navigation bar or side menu component here */}
    //     <Routes>
    //       <Route path="/"  element={<AppLayout />} />
    //       <Route path="/queues" element={<QueuesPage />} />
    //       <Route path="/queues/:id" element={<QueueDetailPage />} />
    //       <Route path="/queues/:queueId/messages" element={<MessagesPage />} />
    //     </Routes>
    //   </Router>
    // </ThemeProvider>

    return (
      <Router>
        <Routes>
          {/**
           * The route with path="/" uses AppLayout as the element,
           * so all child routes share that layout (the header + sidebar).
           */}
          <Route path="/" element={<AppLayout />}>
            <Route path="/"  element={<AppLayout />} />
           <Route path="/queues" element={<QueuesPage />} />
           <Route path="/queues/:id" element={<QueueDetailPage />} />
           <Route path="/queues/:queueId/messages" element={<MessagesPage />} />
           <Route path="/messages" element={<AllMessagesPage />} />
          </Route>
        </Routes>
      </Router>
    );
}

export default App;
