// Store WebSocket connections for each port
const portWebSockets = new Map<number, Set<any>>();

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