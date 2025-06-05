import { NextRequest, NextResponse } from 'next/server';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

// Store WebSocket connections for each port
const portWebSockets = new Map<number, Set<any>>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const port = parseInt(searchParams.get('port') || '7000');

  // Check if this is a WebSocket upgrade request
  if (request.headers.get('upgrade') !== 'websocket') {
    return new NextResponse('Expected WebSocket upgrade', { status: 426 });
  }

  try {
    // This is a simplified example - in production, you'd need proper WebSocket handling
    // For Next.js, we'll return instructions for the client to connect to a separate WebSocket server
    return NextResponse.json({
      message: 'WebSocket endpoint ready',
      port: port,
      wsUrl: `ws://localhost:3001/tcp-ws?port=${port}`
    });
  } catch (error) {
    console.error('WebSocket setup error:', error);
    return NextResponse.json({ error: 'Failed to setup WebSocket' }, { status: 500 });
  }
}

// Function to broadcast message to all WebSocket clients for a specific port
export function broadcastToPort(port: number, message: any) {
  const clients = portWebSockets.get(port);
  if (clients) {
    const messageStr = JSON.stringify(message);
    clients.forEach(ws => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error('Error sending WebSocket message:', error);
        }
      }
    });
  }
}

// Function to add WebSocket client for a port
export function addWebSocketClient(port: number, ws: any) {
  if (!portWebSockets.has(port)) {
    portWebSockets.set(port, new Set());
  }
  portWebSockets.get(port)!.add(ws);
}

// Function to remove WebSocket client
export function removeWebSocketClient(port: number, ws: any) {
  const clients = portWebSockets.get(port);
  if (clients) {
    clients.delete(ws);
    if (clients.size === 0) {
      portWebSockets.delete(port);
    }
  }
} 