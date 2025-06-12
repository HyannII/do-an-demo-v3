import { useState, useEffect, useCallback, useRef } from 'react';

interface ClientConnection {
  id: string;
  ip: string;
  port: number;
  status: string;
  connectedAt: Date;
}

interface TCPServerState {
  status: 'stopped' | 'running';
  port: number;
  clients: ClientConnection[];
  clientCount: number;
  echo: boolean;
  redirectToUDP: boolean;
  receivedData: string;
  loading: boolean;
  error: string | null;
}

export function useTCPServer(initialPort: number = 7000) {
  const [state, setState] = useState<TCPServerState>({
    status: 'stopped',
    port: initialPort,
    clients: [],
    clientCount: 0,
    echo: false,
    redirectToUDP: false,
    receivedData: '',
    loading: false,
    error: null
  });

  // Check for restored servers on mount
  const checkRestoredServers = useCallback(async () => {
    try {
      const response = await fetch('/api/tcp-server?action=all-servers');
      const result = await response.json();
      
      if (response.ok && result.servers.length > 0) {
        // Find if current port is among restored servers
        const restoredServer = result.servers.find((server: any) => server.port === state.port);
        if (restoredServer) {
          setState(prev => ({
            ...prev,
            status: 'running',
            echo: restoredServer.echo,
            redirectToUDP: restoredServer.redirectToUDP,
            clients: restoredServer.clients.map((client: any) => ({
              ...client,
              connectedAt: new Date(client.connectedAt)
            })),
            clientCount: restoredServer.clientCount
          }));
          console.log(`Restored server state for port ${state.port}`);
        }
      }
    } catch (error) {
      console.error('Failed to check restored servers:', error);
    }
  }, [state.port]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Append data to received data
  const appendReceivedData = useCallback((data: string) => {
    setState(prev => ({
      ...prev,
      receivedData: prev.receivedData + data + '\n'
    }));
  }, []);

  // Clear received data
  const clearReceivedData = useCallback(async () => {
    // Clear on server
    if (state.status === 'running') {
      try {
        await fetch('/api/tcp-server', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'clearMessages',
            port: state.port
          }),
        });
      } catch (error) {
        console.error('Failed to clear server messages:', error);
      }
    }
    
    // Clear on client
    setState(prev => ({
      ...prev,
      receivedData: ''
    }));
  }, [state.status, state.port]);

  // Connect to WebSocket for real-time updates
  const connectWebSocket = useCallback(() => {
    try {
      // In a real implementation, you would connect to your WebSocket server
      // For now, we'll simulate WebSocket connection
      console.log(`Attempting to connect WebSocket for port ${state.port}`);
      
      // Simulate WebSocket connection - in production, replace with actual WebSocket
      // wsRef.current = new WebSocket(`ws://localhost:3001/tcp-ws?port=${state.port}`);
      
      // wsRef.current.onopen = () => {
      //   console.log('WebSocket connected');
      // };

      // wsRef.current.onmessage = (event) => {
      //   const message = JSON.parse(event.data);
      //   handleWebSocketMessage(message);
      // };

      // wsRef.current.onerror = (error) => {
      //   console.error('WebSocket error:', error);
      // };

      // wsRef.current.onclose = () => {
      //   console.log('WebSocket disconnected');
      //   // Attempt to reconnect after 3 seconds
      //   reconnectTimeoutRef.current = setTimeout(() => {
      //     if (state.status === 'running') {
      //       connectWebSocket();
      //     }
      //   }, 3000);
      // };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [state.port, state.status]);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'client_connected':
        setState(prev => ({
          ...prev,
          clients: [...prev.clients, message.client],
          clientCount: prev.clientCount + 1
        }));
        appendReceivedData(`Client connected: ${message.client.ip}:${message.client.port}`);
        break;

      case 'client_disconnected':
        setState(prev => ({
          ...prev,
          clients: prev.clients.filter(c => c.id !== message.clientId),
          clientCount: Math.max(0, prev.clientCount - 1)
        }));
        appendReceivedData(`Client disconnected: ${message.clientId}`);
        break;

      case 'data_received':
        appendReceivedData(`Received: ${message.data}`);
        break;

      case 'data_sent':
        appendReceivedData(`Sent: ${message.data}`);
        break;

      case 'server_error':
        setState(prev => ({
          ...prev,
          error: message.error
        }));
        appendReceivedData(`Error: ${message.error}`);
        break;
    }
  }, [appendReceivedData]);

  // Start TCP server
  const startServer = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch('/api/tcp-server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          port: state.port,
          serverEcho: state.echo,
          redirectToUDP: state.redirectToUDP
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setState(prev => ({
          ...prev,
          status: 'running',
          loading: false,
          error: null
        }));
        // Don't append here since server messages will be fetched
        connectWebSocket();
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: result.error
        }));
        appendReceivedData(`Failed to start server: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      appendReceivedData(`Error starting server: ${errorMessage}`);
    }
  }, [state.port, state.echo, state.redirectToUDP, state.status, appendReceivedData, connectWebSocket]);

  // Stop TCP server
  const stopServer = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/tcp-server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'stop',
          port: state.port
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setState(prev => ({
          ...prev,
          status: 'stopped',
          clients: [],
          clientCount: 0,
          loading: false,
          error: null
        }));
        // Don't append here since this will be handled by server messages
        
        // Close WebSocket connection
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
        
        // Clear reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: result.error
        }));
        appendReceivedData(`Failed to stop server: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      appendReceivedData(`Error stopping server: ${errorMessage}`);
    }
  }, [state.port, appendReceivedData]);

  // Send data to all connected clients or specific IP
  const sendData = useCallback(async (data: string, isHex: boolean = false, targetIP?: string) => {
    if (!data.trim() || state.status !== 'running') {
      return;
    }

    try {
      const response = await fetch('/api/tcp-server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send',
          port: state.port,
          data,
          isHex,
          targetIP
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Don't append here since server messages will be fetched automatically
        // The sent message and echo will be shown via server messages
      } else {
        appendReceivedData(`Failed to send data: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      appendReceivedData(`Error sending data: ${errorMessage}`);
    }
  }, [state.port, state.status, state.echo, appendReceivedData]);

  // Update server settings
  const updateSettings = useCallback(async (echo: boolean, redirectToUDP: boolean) => {
    setState(prev => ({
      ...prev,
      echo,
      redirectToUDP
    }));

    if (state.status === 'running') {
      try {
        await fetch('/api/tcp-server', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'updateSettings',
            port: state.port,
            serverEcho: echo,
            redirectToUDP
          }),
        });
      } catch (error) {
        console.error('Failed to update server settings:', error);
      }
    }
  }, [state.port, state.status]);

  // Update port
  const updatePort = useCallback((newPort: number) => {
    if (state.status === 'stopped') {
      setState(prev => ({
        ...prev,
        port: newPort
      }));
    }
  }, [state.status]);

  // Fetch server status and messages periodically
  const fetchServerStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/tcp-server?port=${state.port}`);
      const result = await response.json();

      if (response.ok && result.status === 'running') {
        // Format messages for display
        const formattedMessages = (result.messages || []).map((msg: any) => {
          const timestamp = new Date(msg.timestamp).toLocaleTimeString();
          return `[${timestamp}] ${msg.data}`;
        }).join('\n');

        setState(prev => ({
          ...prev,
          status: result.status,
          clients: result.clients.map((client: any) => ({
            ...client,
            connectedAt: new Date(client.connectedAt)
          })),
          clientCount: result.clientCount,
          echo: result.echo,
          redirectToUDP: result.redirectToUDP,
          receivedData: formattedMessages
        }));
      }
    } catch (error) {
      console.error('Failed to fetch server status:', error);
    }
  }, [state.port]);

  // Check for restored servers on mount
  useEffect(() => {
    checkRestoredServers();
  }, [checkRestoredServers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Fetch status periodically when server is running
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (state.status === 'running') {
      interval = setInterval(fetchServerStatus, 500); // Check every 500ms for real-time client status updates
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [state.status, fetchServerStatus]);

  // Manual restore state function
  const restoreState = useCallback(async () => {
    try {
      const response = await fetch('/api/tcp-server?action=restore-state');
      const result = await response.json();
      
      if (response.ok) {
        // After restoration, check for restored servers
        setTimeout(() => {
          checkRestoredServers();
        }, 1000); // Give server time to restore
        
        return result.message;
      }
      throw new Error(result.error || 'Failed to restore state');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        error: errorMessage
      }));
      throw error;
    }
  }, [checkRestoredServers]);

  return {
    ...state,
    startServer,
    stopServer,
    sendData,
    updateSettings,
    updatePort,
    clearReceivedData,
    appendReceivedData,
    restoreState
  };
}