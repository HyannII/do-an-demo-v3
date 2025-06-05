// TEA (Tiny Encryption Algorithm) implementation
// This is a simplified version for demonstration purposes

export interface TEAKeys {
  key1: string;
  key2: string;
  key3: string;
  key4: string;
}

// Convert hex string to 32-bit integer
function hexToUint32(hex: string): number {
  return parseInt(hex.padStart(8, '0'), 16) >>> 0;
}

// Convert 32-bit integer to hex string
function uint32ToHex(num: number): string {
  return (num >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

// TEA encryption of a single 64-bit block
function teaEncryptBlock(v0: number, v1: number, key: number[]): [number, number] {
  let sum = 0;
  const delta = 0x9e3779b9;
  const k0 = key[0], k1 = key[1], k2 = key[2], k3 = key[3];

  for (let i = 0; i < 32; i++) {
    sum = (sum + delta) >>> 0;
    v0 = (v0 + (((v1 << 4) + k0) ^ (v1 + sum) ^ ((v1 >>> 5) + k1))) >>> 0;
    v1 = (v1 + (((v0 << 4) + k2) ^ (v0 + sum) ^ ((v0 >>> 5) + k3))) >>> 0;
  }

  return [v0, v1];
}

// TEA decryption of a single 64-bit block
function teaDecryptBlock(v0: number, v1: number, key: number[]): [number, number] {
  let sum = 0xC6EF3720; // delta * 32
  const delta = 0x9e3779b9;
  const k0 = key[0], k1 = key[1], k2 = key[2], k3 = key[3];

  for (let i = 0; i < 32; i++) {
    v1 = (v1 - (((v0 << 4) + k2) ^ (v0 + sum) ^ ((v0 >>> 5) + k3))) >>> 0;
    v0 = (v0 - (((v1 << 4) + k0) ^ (v1 + sum) ^ ((v1 >>> 5) + k1))) >>> 0;
    sum = (sum - delta) >>> 0;
  }

  return [v0, v1];
}

// Convert TEA keys from hex strings to number array
function parseTeaKeys(keys: TEAKeys): number[] {
  return [
    hexToUint32(keys.key1),
    hexToUint32(keys.key2),
    hexToUint32(keys.key3),
    hexToUint32(keys.key4)
  ];
}

// Encrypt data using TEA
export function teaEncrypt(data: string, keys: TEAKeys): string {
  const keyArray = parseTeaKeys(keys);
  const dataBytes = Buffer.from(data, 'utf8');
  
  // Pad data to multiple of 8 bytes
  const paddedLength = Math.ceil(dataBytes.length / 8) * 8;
  const paddedData = Buffer.alloc(paddedLength);
  dataBytes.copy(paddedData);
  
  let result = '';
  
  // Process data in 8-byte blocks
  for (let i = 0; i < paddedLength; i += 8) {
    const v0 = paddedData.readUInt32BE(i);
    const v1 = paddedData.readUInt32BE(i + 4);
    
    const [encrypted0, encrypted1] = teaEncryptBlock(v0, v1, keyArray);
    
    result += uint32ToHex(encrypted0) + uint32ToHex(encrypted1);
  }
  
  return result;
}

// Decrypt data using TEA
export function teaDecrypt(encryptedHex: string, keys: TEAKeys): string {
  const keyArray = parseTeaKeys(keys);
  
  if (encryptedHex.length % 16 !== 0) {
    throw new Error('Invalid encrypted data length');
  }
  
  const resultBytes: number[] = [];
  
  // Process data in 16-character hex blocks (8 bytes)
  for (let i = 0; i < encryptedHex.length; i += 16) {
    const v0 = hexToUint32(encryptedHex.substr(i, 8));
    const v1 = hexToUint32(encryptedHex.substr(i + 8, 8));
    
    const [decrypted0, decrypted1] = teaDecryptBlock(v0, v1, keyArray);
    
    // Convert back to bytes
    resultBytes.push((decrypted0 >>> 24) & 0xFF);
    resultBytes.push((decrypted0 >>> 16) & 0xFF);
    resultBytes.push((decrypted0 >>> 8) & 0xFF);
    resultBytes.push(decrypted0 & 0xFF);
    resultBytes.push((decrypted1 >>> 24) & 0xFF);
    resultBytes.push((decrypted1 >>> 16) & 0xFF);
    resultBytes.push((decrypted1 >>> 8) & 0xFF);
    resultBytes.push(decrypted1 & 0xFF);
  }
  
  // Remove padding (null bytes at the end)
  while (resultBytes.length > 0 && resultBytes[resultBytes.length - 1] === 0) {
    resultBytes.pop();
  }
  
  return Buffer.from(resultBytes).toString('utf8');
}

// Validate TEA key format
export function validateTeaKey(key: string): boolean {
  const trimmedKey = key.trim();
  return /^[0-9A-Fa-f]{8}$/.test(trimmedKey);
}

// Validate all TEA keys
export function validateTeaKeys(keys: TEAKeys): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!validateTeaKey(keys.key1)) {
    errors.push('Key 1 must be 8 hexadecimal characters');
  }
  if (!validateTeaKey(keys.key2)) {
    errors.push('Key 2 must be 8 hexadecimal characters');
  }
  if (!validateTeaKey(keys.key3)) {
    errors.push('Key 3 must be 8 hexadecimal characters');
  }
  if (!validateTeaKey(keys.key4)) {
    errors.push('Key 4 must be 8 hexadecimal characters');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
} 