import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { ALGORITHM, IV_LENGTH, AUTH_TAG_LENGTH, KEY_HEX_LENGTH } from './encryption.constants'

export function encrypt(plaintext: string, keyHex: string): string {
  if (keyHex.length !== KEY_HEX_LENGTH || !/^[\da-f]+$/i.test(keyHex)) {
    throw new Error('Encryption key must be exactly 64 hex characters (32 bytes)')
  }
  const key = Buffer.from(keyHex, 'hex')
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:ciphertext (all base64)
  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':')
}

export function decrypt(encryptedString: string, keyHex: string): string {
  const parts = encryptedString.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format')
  }

  const [ivBase64, authTagBase64, ciphertextBase64 = ''] = parts
  if (!ivBase64 || !authTagBase64) {
    throw new Error('Invalid encrypted format: missing parts')
  }

  const key = Buffer.from(keyHex, 'hex')
  const iv = Buffer.from(ivBase64, 'base64')
  const authTag = Buffer.from(authTagBase64, 'base64')
  const ciphertext = Buffer.from(ciphertextBase64, 'base64')

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(`Invalid auth tag length: expected ${AUTH_TAG_LENGTH} bytes`)
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
