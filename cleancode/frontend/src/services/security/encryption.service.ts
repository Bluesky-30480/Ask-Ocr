/**
 * Encryption Service
 * Handles secure encryption/decryption of sensitive data like API keys
 * Uses Web Crypto API for strong encryption
 */

export class EncryptionService {
  private algorithm = 'AES-GCM';
  private keyLength = 256;
  private saltLength = 16;
  private ivLength = 12;
  private iterations = 100000; // PBKDF2 iterations

  /**
   * Encrypt data with password
   * @param plaintext - The data to encrypt
   * @param password - User password for encryption
   * @returns Encrypted data as base64 string
   */
  async encrypt(plaintext: string, password: string): Promise<string> {
    try {
      // Generate random salt and IV
      const salt = crypto.getRandomValues(new Uint8Array(this.saltLength));
      const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));

      // Derive key from password
      const key = await this.deriveKey(password, salt);

      // Encrypt data
      const encoder = new TextEncoder();
      const data = encoder.encode(plaintext);

      const encryptedData = await crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv: iv,
        },
        key,
        data
      );

      // Combine salt + iv + encrypted data
      const combined = new Uint8Array(
        salt.length + iv.length + encryptedData.byteLength
      );
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

      // Convert to base64
      return this.arrayBufferToBase64(combined);
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data with password
   * @param encrypted - Base64 encrypted string
   * @param password - User password for decryption
   * @returns Decrypted plaintext
   */
  async decrypt(encrypted: string, password: string): Promise<string> {
    try {
      // Convert from base64
      const combined = this.base64ToArrayBuffer(encrypted);

      // Extract salt, IV, and encrypted data
      const salt = combined.slice(0, this.saltLength);
      const iv = combined.slice(this.saltLength, this.saltLength + this.ivLength);
      const encryptedData = combined.slice(this.saltLength + this.ivLength);

      // Derive key from password
      const key = await this.deriveKey(password, salt);

      // Decrypt data
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv: iv,
        },
        key,
        encryptedData
      );

      // Convert to string
      const decoder = new TextDecoder();
      return decoder.decode(decryptedData);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data - invalid password or corrupted data');
    }
  }

  /**
   * Derive encryption key from password using PBKDF2
   */
  private async deriveKey(
    password: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive actual encryption key
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt.buffer as ArrayBuffer,
        iterations: this.iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: this.algorithm,
        length: this.keyLength,
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Hash password for verification (not for encryption)
   */
  async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return this.arrayBufferToBase64(new Uint8Array(hash));
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const passwordHash = await this.hashPassword(password);
      return passwordHash === hash;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();
