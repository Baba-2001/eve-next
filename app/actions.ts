"use server";
import { encrypt, decrypt } from "@/lib/crypto";

export async function getSecureToken(text: string) {
  return `[MASKED_${encrypt(text)}]`;
}

export async function unmaskTextOnServer(text: string | undefined) {
  if (!text) return text;
  
  const regex = /\[MASKED_(.*?)\]/g;
  let matches = Array.from(text.matchAll(regex));
  
  let unmasked = text;
  for (const match of matches) {
    const decrypted = decrypt(match[1]);
    if (decrypted) {
      unmasked = unmasked.replace(match[0], decrypted);
    }
  }
  return unmasked;
}
