import { randomBytes } from 'node:crypto'
import { encrypt, decrypt } from '../../src/common/utils/encryption.utility'

describe('Encryption Utility', () => {
  const key = randomBytes(32).toString('hex')

  it('should encrypt and decrypt a string', () => {
    const plaintext = '{"baseUrl":"https://wazuh:55000","username":"admin","password":"secret"}'
    const encrypted = encrypt(plaintext, key)
    const decrypted = decrypt(encrypted, key)
    expect(decrypted).toBe(plaintext)
  })

  it('should produce different ciphertexts for the same input (random IV)', () => {
    const plaintext = 'same input'
    const encrypted1 = encrypt(plaintext, key)
    const encrypted2 = encrypt(plaintext, key)
    expect(encrypted1).not.toBe(encrypted2)
  })

  it('should fail with wrong key', () => {
    const plaintext = 'secret data'
    const encrypted = encrypt(plaintext, key)
    const wrongKey = randomBytes(32).toString('hex')
    expect(() => decrypt(encrypted, wrongKey)).toThrow()
  })

  it('should fail with tampered ciphertext', () => {
    const plaintext = 'secret data'
    const encrypted = encrypt(plaintext, key)
    const tampered = `${encrypted.slice(0, -5)}XXXXX`
    expect(() => decrypt(tampered, key)).toThrow()
  })

  it('should handle empty string', () => {
    const encrypted = encrypt('', key)
    const decrypted = decrypt(encrypted, key)
    expect(decrypted).toBe('')
  })

  it('should handle unicode content', () => {
    const plaintext = '{"name":"AuraSpear","emoji":"🔒","arabic":"مرحبا"}'
    const encrypted = encrypt(plaintext, key)
    const decrypted = decrypt(encrypted, key)
    expect(decrypted).toBe(plaintext)
  })
})
