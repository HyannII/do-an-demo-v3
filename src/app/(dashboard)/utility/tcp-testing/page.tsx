"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTCPServer } from "@/hooks/useTCPServer";
import { teaEncrypt, teaDecrypt, validateTeaKeys, TEAKeys } from "@/utils/tea";

export default function TCPTestingPage() {
  const {
    status,
    port,
    clients,
    clientCount,
    echo,
    redirectToUDP,
    receivedData,
    loading,
    error,
    startServer,
    stopServer,
    sendData: tcpSendData,
    updateSettings,
    updatePort,
    clearReceivedData,
    restoreState
  } = useTCPServer(7000);

  const [sendData, setSendData] = useState<string>("");
  const [isHexMode, setIsHexMode] = useState<boolean>(false);
  const [selectedTargetIP, setSelectedTargetIP] = useState<string>("all");
  const [teaKey1, setTeaKey1] = useState<string>("01020304");
  const [teaKey2, setTeaKey2] = useState<string>("05060708");
  const [teaKey3, setTeaKey3] = useState<string>("090A0B0C");
  const [teaKey4, setTeaKey4] = useState<string>("0D0E0F10");
  const [cursorMode, setCursorMode] = useState<'hex' | 'decimal'>('hex');
  const [cursorValue, setCursorValue] = useState<string>("32");
  
  const receivedDataRef = useRef<HTMLTextAreaElement>(null);
  const sendDataRef = useRef<HTMLTextAreaElement>(null);

  // Handle server settings changes
  const handleEchoChange = (newEcho: boolean) => {
    updateSettings(newEcho, redirectToUDP);
  };

  const handleRedirectToUDPChange = (newRedirectToUDP: boolean) => {
    updateSettings(echo, newRedirectToUDP);
  };

  // Handle port change
  const handlePortChange = (newPort: number) => {
    updatePort(newPort);
  };

  const sendMessage = async () => {
    if (sendData.trim() && status === 'running') {
      const targetIP = selectedTargetIP === "all" ? undefined : selectedTargetIP;
      await tcpSendData(sendData, isHexMode, targetIP);
      setSendData("");
    }
  };

  // Get unique IPs from connected clients
  const getUniqueClientIPs = () => {
    const uniqueIPs = [...new Set(clients.map(client => client.ip))];
    return uniqueIPs;
  };

  // TEA encryption/decryption functions
  const handleTeaEncrypt = () => {
    if (!sendData.trim()) return;
    
    const keys: TEAKeys = {
      key1: teaKey1,
      key2: teaKey2,
      key3: teaKey3,
      key4: teaKey4
    };
    
    const validation = validateTeaKeys(keys);
    if (!validation.valid) {
      alert('Invalid TEA keys:\n' + validation.errors.join('\n'));
      return;
    }
    
    try {
      const encrypted = teaEncrypt(sendData, keys);
      setSendData(encrypted);
      setIsHexMode(true); // Switch to hex mode for encrypted data
    } catch (error) {
      alert('Encryption failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleTeaDecrypt = () => {
    if (!sendData.trim()) return;
    
    const keys: TEAKeys = {
      key1: teaKey1,
      key2: teaKey2,
      key3: teaKey3,
      key4: teaKey4
    };
    
    const validation = validateTeaKeys(keys);
    if (!validation.valid) {
      alert('Invalid TEA keys:\n' + validation.errors.join('\n'));
      return;
    }
    
    try {
      const decrypted = teaDecrypt(sendData, keys);
      setSendData(decrypted);
      setIsHexMode(false); // Switch to text mode for decrypted data
    } catch (error) {
      alert('Decryption failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const convertCursor = () => {
    const value = parseInt(cursorValue);
    if (!isNaN(value)) {
      if (cursorMode === 'hex') {
        setCursorValue(value.toString(16).toUpperCase());
      } else {
        setCursorValue(value.toString());
      }
    }
  };

  const handleRestoreState = async () => {
    try {
      const message = await restoreState();
      alert(`State restored successfully: ${message}`);
    } catch (error) {
      alert(`Failed to restore state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Auto-scroll received data to bottom
  useEffect(() => {
    if (receivedDataRef.current) {
      receivedDataRef.current.scrollTop = receivedDataRef.current.scrollHeight;
    }
  }, [receivedData]);

  // Reset target IP if selected IP is no longer connected
  useEffect(() => {
    if (selectedTargetIP !== "all") {
      const currentIPs = getUniqueClientIPs();
      if (!currentIPs.includes(selectedTargetIP)) {
        setSelectedTargetIP("all");
      }
    }
  }, [clients, selectedTargetIP]);

  return (
    <div className="flex-1 p-6 bg-white dark:bg-gray-900 overflow-y-auto">
      <div className="bg-gray-100 dark:bg-gray-800 shadow-sm rounded-lg p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            TCP Testing
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            TCP Server testing tool with interface similar to Hercules 3.2.8
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Data */}
          <div className="lg:col-span-2 space-y-6">
            {/* Received Data */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Received data
                </label>
                <button
                  onClick={clearReceivedData}
                  className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Clear
                </button>
              </div>
              <textarea
                ref={receivedDataRef}
                value={receivedData}
                readOnly
                className="w-full h-48 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm resize-none"
                placeholder="Received data will appear here..."
              />
            </div>

            {/* Send Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Send data
              </label>
                              <div className="space-y-3">
                <textarea
                  ref={sendDataRef}
                  value={sendData}
                  onChange={(e) => setSendData(e.target.value)}
                  className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  placeholder={isHexMode ? "Enter hex data (e.g., 48656C6C6F)" : "Enter text data..."}
                />
                
                {/* Target IP Selection */}
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-700 dark:text-gray-300">Send to:</label>
                  <select
                    value={selectedTargetIP}
                    onChange={(e) => setSelectedTargetIP(e.target.value)}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="all">📡 All connected clients ({clientCount})</option>
                    {getUniqueClientIPs().map((ip) => {
                      const ipClients = clients.filter(c => c.ip === ip);
                      const connectionCount = ipClients.length;
                      const ports = ipClients.map(c => c.port).join(', ');
                      return (
                        <option key={ip} value={ip}>
                          🔗 {ip} - {connectionCount} connection{connectionCount > 1 ? 's' : ''} (port: {ports})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="flex gap-3 items-center">
                  <button
                    onClick={sendMessage}
                    disabled={status === 'stopped' || loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending...' : selectedTargetIP === 'all' ? 'Send to All' : `Send to ${selectedTargetIP}`}
                  </button>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isHexMode}
                      onChange={(e) => setIsHexMode(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">HEX</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Cursor Decode */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Cursor decode
              </h3>
              <div className="flex gap-4 items-center">
                <div className="flex gap-2">
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name="cursorMode"
                      checked={cursorMode === 'hex'}
                      onChange={() => setCursorMode('hex')}
                    />
                    <span className="text-sm">HEX</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name="cursorMode"
                      checked={cursorMode === 'decimal'}
                      onChange={() => setCursorMode('decimal')}
                    />
                    <span className="text-sm">Decimal</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={cursorValue}
                  onChange={(e) => setCursorValue(e.target.value)}
                  className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
                <button
                  onClick={convertCursor}
                  className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                >
                  Convert
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Server Status & Settings */}
          <div className="space-y-6">
            {/* Server Status */}
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Server status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 dark:text-gray-400">Port:</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => handlePortChange(parseInt(e.target.value) || 7000)}
                    disabled={status === 'running'}
                    className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <button
                  onClick={status === 'stopped' ? startServer : stopServer}
                  disabled={loading}
                  className={`w-full py-2 px-4 rounded text-white font-medium ${
                    loading 
                      ? 'bg-gray-400 cursor-not-allowed'
                      : status === 'stopped' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {loading ? 'Processing...' : status === 'stopped' ? 'Start' : 'Close'}
                </button>
                <div className="text-xs text-gray-500">
                  Status: {status === 'running' ? 'Running' : 'Stopped'}
                  {error && <div className="text-red-500 mt-1">Error: {error}</div>}
                </div>
              </div>
            </div>

            {/* TEA Authorization */}
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                TEA authorization
              </h3>
              <div className="space-y-3">
                <div className="text-xs text-gray-500 mb-2">TEA key:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span>1:</span>
                    <input
                      type="text"
                      value={teaKey1}
                      onChange={(e) => setTeaKey1(e.target.value.toUpperCase())}
                      placeholder="01020304"
                      maxLength={8}
                      className="flex-1 px-1 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span>3:</span>
                    <input
                      type="text"
                      value={teaKey3}
                      onChange={(e) => setTeaKey3(e.target.value.toUpperCase())}
                      placeholder="090A0B0C"
                      maxLength={8}
                      className="flex-1 px-1 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span>2:</span>
                    <input
                      type="text"
                      value={teaKey2}
                      onChange={(e) => setTeaKey2(e.target.value.toUpperCase())}
                      placeholder="05060708"
                      maxLength={8}
                      className="flex-1 px-1 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span>4:</span>
                    <input
                      type="text"
                      value={teaKey4}
                      onChange={(e) => setTeaKey4(e.target.value.toUpperCase())}
                      placeholder="0D0E0F10"
                      maxLength={8}
                      className="flex-1 px-1 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleTeaEncrypt}
                    disabled={!sendData.trim()}
                    className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Encrypt
                  </button>
                  <button
                    onClick={handleTeaDecrypt}
                    disabled={!sendData.trim()}
                    className="flex-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Decrypt
                  </button>
                </div>
              </div>
            </div>

            {/* Client Authorization */}
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Client authorization
              </h3>
              <p className="text-xs text-gray-500">Client authorization settings can be configured here</p>
            </div>

            {/* Client Connection Status */}
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Client connection status
              </h3>
                             <div className="space-y-2 max-h-40 overflow-y-auto">
                {clients.length === 0 ? (
                  <p className="text-xs text-gray-500">No client connections</p>
                ) : (
                  clients.map((client: any) => (
                    <div key={client.id} className="text-xs bg-gray-50 dark:bg-gray-600 p-2 rounded">
                      <div className="text-green-600 dark:text-green-400 font-mono text-sm font-semibold">
                        {client.ip}:{client.port}
                      </div>
                      <div className="text-gray-500 text-xs">
                        IP: {client.ip}
                      </div>
                      <div className="text-gray-500 text-xs">
                        Status: {client.status}
                      </div>
                      <div className="text-gray-500 text-xs">
                        Connected: {new Date(client.connectedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                <span className="text-xs text-gray-500">
                  Clients count: {clientCount}
                </span>
              </div>
            </div>

            {/* Server Settings */}
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Server settings
              </h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={echo}
                      onChange={(e) => handleEchoChange(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Server echo</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={redirectToUDP}
                      onChange={(e) => handleRedirectToUDPChange(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Redirect to UDP</span>
                  </label>
                </div>
                
                <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                  <button
                    onClick={handleRestoreState}
                    disabled={loading}
                    className="w-full px-3 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    🔄 Restore Server State
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    Restore previously running servers after refresh
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}