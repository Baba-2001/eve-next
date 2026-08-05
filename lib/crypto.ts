import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
// In production, use process.env.ENCRYPTION_KEY. For now, a static 32-byte key.
const SECRET = crypto.createHash('sha256').update("super-secret-agent-key").digest();

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');
  // Return format: iv:authTag:encryptedData (URL-safe base64 is better but standard is fine here)
  return Buffer.from(`${iv.toString('base64')}:${authTag}:${encrypted}`).toString('base64');
}

export function decrypt(encryptedToken: string): string | null {
  try {
    const decoded = Buffer.from(encryptedToken, 'base64').toString('utf8');
    const [ivStr, authTagStr, data] = decoded.split(':');
    if (!ivStr || !authTagStr || !data) return null;
    
    const iv = Buffer.from(ivStr, 'base64');
    const authTag = Buffer.from(authTagStr, 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return null;
  }
}
