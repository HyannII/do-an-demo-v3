import { NextRequest, NextResponse } from 'next/server';
import net from 'net';
import fs from 'fs';
import path from 'path';

// Function to extract clean IPv4 address
function getCleanIPv4(address: string | undefined): string {
  if (!address) return 'unknown';
  
  // Remove IPv6 mapping prefix if present (::ffff:)
  if (address.startsWith('::ffff:')) {
    return address.substring(7);
  }
  
  // Handle localhost
  if (address === '::1' || address === '127.0.0.1') {
    return '127.0.0.1';
  }
  
  return address;
}

// Store active servers and connections
const activeServers = new Map<number, {
  server: net.Server;
  clients: Map<string, {
    socket: net.Socket;
    ip: string;
    port: number;
    connectedAt: Date;
  }>;
  echo: boolean;
  redirectToUDP: boolean;
  receivedMessages: Array<{
    timestamp: string;
    from: string;
    data: string;
    type: 'received' | 'sent' | 'system';
  }>;
}>();

const STATE_FILE_PATH = path.join(process.cwd(), 'tcp-server-state.json');

interface ServerState {
  port: number;
  echo: boolean;
  redirectToUDP: boolean;
  startedAt: string;
}

interface PersistedState {
  activeServers: ServerState[];
  lastUpdated: string;
}

// Save current state to file
function saveState() {
  try {
    const state: PersistedState = {
      activeServers: Array.from(activeServers.entries()).map(([port, info]) => ({
        port,
        echo: info.echo,
        redirectToUDP: info.redirectToUDP,
        startedAt: new Date().toISOString()
      })),
      lastUpdated: new Date().toISOString()
    };
    
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(state, null, 2));
    console.log('TCP server state saved');
  } catch (error) {
    console.error('Error saving TCP server state:', error);
  }
}

// Load and restore state from file
function loadState() {
  try {
    if (!fs.existsSync(STATE_FILE_PATH)) {
      console.log('No previous TCP server state found');
      return;
    }

    const stateData = fs.readFileSync(STATE_FILE_PATH, 'utf8');
    const state: PersistedState = JSON.parse(stateData);
    
    console.log('Restoring TCP server state...');
    
    // Restore each server
    state.activeServers.forEach(serverState => {
      try {
        console.log(`Attempting to restore server on port ${serverState.port}`);
        const result = startServer(serverState.port, serverState.echo, serverState.redirectToUDP);
        
        if (result instanceof NextResponse) {
          // Check if it was successful
          console.log(`Server restored on port ${serverState.port}`);
        }
      } catch (error) {
        console.error(`Failed to restore server on port ${serverState.port}:`, error);
      }
    });
    
    console.log('TCP server state restoration completed');
  } catch (error) {
    console.error('Error loading TCP server state:', error);
  }
}

// Initialize state restoration on module load
if (typeof window === 'undefined') { // Only run on server side
  loadState();
}

export async function POST(request: NextRequest) {
  try {
    const { action, port, data, serverEcho, redirectToUDP, isHex, targetIP } = await request.json();

    switch (action) {
      case 'start':
        return startServer(port, serverEcho, redirectToUDP);
      
      case 'stop':
        return stopServer(port);
      
      case 'send':
        return sendData(port, data, isHex, targetIP);
      
      case 'updateSettings':
        return updateServerSettings(port, serverEcho, redirectToUDP);
      
      case 'getMessages':
        return getReceivedMessages(port);
      
      case 'clearMessages':
        return clearReceivedMessages(port);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('TCP Server API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  if (action === 'all-servers') {
    return getAllServersStatus();
  }
  
  if (action === 'restore-state') {
    loadState();
    return NextResponse.json({ message: 'State restoration attempted' });
  }
  
  const port = parseInt(searchParams.get('port') || '7000');
  
  const serverInfo = activeServers.get(port);
  if (!serverInfo) {
    return NextResponse.json({ 
      status: 'stopped', 
      clients: [],
      clientCount: 0 
    });
  }

  const clients = Array.from(serverInfo.clients.values()).map(clientInfo => ({
    id: `${clientInfo.ip}:${clientInfo.port}`,
    ip: clientInfo.ip,
    port: clientInfo.port,
    status: 'Client connected',
    connectedAt: clientInfo.connectedAt.toISOString()
  }));

  return NextResponse.json({
    status: 'running',
    clients,
    clientCount: clients.length,
    echo: serverInfo.echo,
    redirectToUDP: serverInfo.redirectToUDP,
    messages: serverInfo.receivedMessages || []
  });
}

function startServer(port: number, serverEcho: boolean = false, redirectToUDP: boolean = false) {
  if (activeServers.has(port)) {
    return NextResponse.json({ error: 'Server already running on this port' }, { status: 400 });
  }

  try {
    const server = net.createServer();
    const clients = new Map<string, {
      socket: net.Socket;
      ip: string;
      port: number;
      connectedAt: Date;
    }>();

    server.on('connection', (socket) => {
      const clientIP = getCleanIPv4(socket.remoteAddress);
      const clientPort = socket.remotePort || 0;
      const clientId = `${clientIP}:${clientPort}`;
      
      // Add client to map
      clients.set(clientId, {
        socket,
        ip: clientIP,
        port: clientPort,
        connectedAt: new Date()
      });
      
      console.log(`Client connected: ${clientIP}:${clientPort}`);

      // Add connection message
      const serverInfo = activeServers.get(port);
      if (serverInfo) {
        serverInfo.receivedMessages.push({
          timestamp: new Date().toISOString(),
          from: 'system',
          data: `Client connected: ${clientIP}:${clientPort}`,
          type: 'system'
        });
      }

      socket.on('data', (data) => {
        const message = data.toString();
        console.log(`Received data from ${clientIP}: ${message}`);
        
        // Store received message
        const serverInfo = activeServers.get(port);
        if (serverInfo) {
          serverInfo.receivedMessages.push({
            timestamp: new Date().toISOString(),
            from: clientIP,
            data: `[${clientIP}] ${message}`,
            type: 'received'
          });
        }
        
        // Echo back if enabled
        if (serverEcho) {
          socket.write(data);
          // Store echo message
          if (serverInfo) {
            serverInfo.receivedMessages.push({
              timestamp: new Date().toISOString(),
              from: 'server',
              data: `Echo to [${clientIP}]: ${message}`,
              type: 'sent'
            });
          }
        }

        // TODO: Implement redirect to UDP if needed
        if (redirectToUDP) {
          // Implementation for UDP redirect would go here
        }
      });

      socket.on('close', () => {
        clients.delete(clientId);
        console.log(`Client disconnected: ${clientIP}:${clientPort}`);
        
        // Add disconnection message
        const serverInfo = activeServers.get(port);
        if (serverInfo) {
          serverInfo.receivedMessages.push({
            timestamp: new Date().toISOString(),
            from: 'system',
            data: `Client disconnected: ${clientIP}:${clientPort}`,
            type: 'system'
          });
        }
      });

      socket.on('error', (err) => {
        console.error(`Socket error: ${err.message}`);
        clients.delete(clientId);
        
        // Add error message
        const serverInfo = activeServers.get(port);
        if (serverInfo) {
          serverInfo.receivedMessages.push({
            timestamp: new Date().toISOString(),
            from: 'system',
            data: `Client error and disconnected: ${clientIP}:${clientPort}`,
            type: 'system'
          });
        }
      });
    });

    server.on('error', (err) => {
      console.error(`Server error: ${err.message}`);
      activeServers.delete(port);
    });

    server.listen(port, () => {
      console.log(`TCP Server started on port ${port}`);
    });

    activeServers.set(port, {
      server,
      clients,
      echo: serverEcho,
      redirectToUDP,
      receivedMessages: [{
        timestamp: new Date().toISOString(),
        from: 'system',
        data: `Server started on port ${port}`,
        type: 'system'
      }]
    });

    // Save state after starting server
    saveState();

    return NextResponse.json({ 
      message: `Server started on port ${port}`,
      status: 'running'
    });

  } catch (error) {
    console.error('Error starting server:', error);
    return NextResponse.json({ error: 'Failed to start server' }, { status: 500 });
  }
}

function stopServer(port: number) {
  const serverInfo = activeServers.get(port);
  if (!serverInfo) {
    return NextResponse.json({ error: 'No server running on this port' }, { status: 400 });
  }

  try {
    // Close all client connections
    serverInfo.clients.forEach((clientInfo) => {
      clientInfo.socket.destroy();
    });
    
    // Close the server
    serverInfo.server.close(() => {
      console.log(`Server on port ${port} closed`);
    });

    activeServers.delete(port);

    // Save state after stopping server
    saveState();

    return NextResponse.json({ 
      message: `Server stopped on port ${port}`,
      status: 'stopped'
    });

  } catch (error) {
    console.error('Error stopping server:', error);
    return NextResponse.json({ error: 'Failed to stop server' }, { status: 500 });
  }
}

function sendData(port: number, data: string, isHex: boolean = false, targetIP?: string) {
  const serverInfo = activeServers.get(port);
  if (!serverInfo) {
    return NextResponse.json({ error: 'No server running on this port' }, { status: 400 });
  }

  try {
    let dataToSend: Buffer;
    
    if (isHex) {
      // Convert hex string to buffer
      const hexString = data.replace(/\s/g, '');
      if (hexString.length % 2 !== 0) {
        return NextResponse.json({ error: 'Invalid hex data' }, { status: 400 });
      }
      dataToSend = Buffer.from(hexString, 'hex');
    } else {
      dataToSend = Buffer.from(data, 'utf8');
    }

    let sentCount = 0;

    if (targetIP) {
      // Send to specific IP only
      console.log(`Targeting IP: ${targetIP}`);
      console.log(`Available clients:`, Array.from(serverInfo.clients.entries()).map(([id, info]) => ({ id, ip: info.ip })));
      
      const targetClients = Array.from(serverInfo.clients.entries()).filter(([clientId, clientInfo]) => {
        console.log(`Comparing: clientInfo.ip="${clientInfo.ip}" === targetIP="${targetIP}" -> ${clientInfo.ip === targetIP}`);
        return clientInfo.ip === targetIP;
      });

      console.log(`Found ${targetClients.length} target clients`);

      if (targetClients.length === 0) {
        return NextResponse.json({ error: `No clients found with IP: ${targetIP}` }, { status: 400 });
      }

      targetClients.forEach(([clientId, clientInfo]) => {
        try {
          console.log(`Sending data to client ${clientId} (${clientInfo.ip}:${clientInfo.port})`);
          clientInfo.socket.write(dataToSend);
          sentCount++;
          console.log(`Successfully sent to ${clientId}`);
        } catch (err) {
          console.error(`Error sending to client ${clientId}: ${err}`);
        }
      });

      // Store sent message with detailed info
      const clientList = targetClients.map(([clientId]) => clientId).join(', ');
      serverInfo.receivedMessages.push({
        timestamp: new Date().toISOString(),
        from: 'server',
        data: `Sent to ${sentCount} client(s) at [${targetIP}]: ${data}`,
        type: 'sent'
      });

      return NextResponse.json({ 
        message: `Data sent to ${sentCount} clients at ${targetIP} (${clientList})`,
        sentCount,
        targetIP
      });

    } else {
      // Send to all connected clients
      serverInfo.clients.forEach((clientInfo) => {
        try {
          clientInfo.socket.write(dataToSend);
          sentCount++;
        } catch (err) {
          console.error(`Error sending to client: ${err}`);
        }
      });

      // Store sent message
      serverInfo.receivedMessages.push({
        timestamp: new Date().toISOString(),
        from: 'server',
        data: `Sent to ${sentCount} clients: ${data}`,
        type: 'sent'
      });

      return NextResponse.json({ 
        message: `Data sent to ${sentCount} clients`,
        sentCount
      });
    }

  } catch (error) {
    console.error('Error sending data:', error);
    return NextResponse.json({ error: 'Failed to send data' }, { status: 500 });
  }
}

function updateServerSettings(port: number, serverEcho: boolean, redirectToUDP: boolean) {
  const serverInfo = activeServers.get(port);
  if (!serverInfo) {
    return NextResponse.json({ error: 'No server running on this port' }, { status: 400 });
  }

  serverInfo.echo = serverEcho;
  serverInfo.redirectToUDP = redirectToUDP;

  // Save state after updating settings
  saveState();

  return NextResponse.json({ 
    message: 'Server settings updated',
    echo: serverEcho,
    redirectToUDP
  });
}

function getReceivedMessages(port: number) {
  const serverInfo = activeServers.get(port);
  if (!serverInfo) {
    return NextResponse.json({ error: 'No server running on this port' }, { status: 400 });
  }

  return NextResponse.json({ 
    messages: serverInfo.receivedMessages || []
  });
}

function clearReceivedMessages(port: number) {
  const serverInfo = activeServers.get(port);
  if (!serverInfo) {
    return NextResponse.json({ error: 'No server running on this port' }, { status: 400 });
  }

  serverInfo.receivedMessages = [];
  
  return NextResponse.json({ 
    message: 'Messages cleared'
  });
}

function getAllServersStatus() {
  const servers = Array.from(activeServers.entries()).map(([port, info]) => {
    const clients = Array.from(info.clients.values()).map(clientInfo => ({
      id: `${clientInfo.ip}:${clientInfo.port}`,
      ip: clientInfo.ip,
      port: clientInfo.port,
      status: 'Client connected',
      connectedAt: clientInfo.connectedAt.toISOString()
    }));

    return {
      port,
      status: 'running',
      echo: info.echo,
      redirectToUDP: info.redirectToUDP,
      clientCount: clients.length,
      clients,
      messagesCount: info.receivedMessages?.length || 0
    };
  });

  return NextResponse.json({
    servers,
    totalServers: servers.length,
    totalClients: servers.reduce((sum, server) => sum + server.clientCount, 0)
  });
} 