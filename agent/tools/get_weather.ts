import { defineTool } from "eve/tools";
import { z } from "zod";
import { encrypt, decrypt } from "../../lib/crypto";

function unmask(email: string) {
  const match = email.match(/\[MASKED_(.*?)\]/);
  if (match) {
    const decrypted = decrypt(match[1]);
    if (decrypted) return decrypted;
  }
  return email;
}

function mask(email: string) {
  return `[MASKED_${encrypt(email)}]`;
}

// The model sees this tool as `get_weather`, from the filename.
export default defineTool({
  description: "Get the current weather for a city.",
  inputSchema: z.object({ city: z.string().min(1), email: z.string() }),
  async execute({ city, email }) {
    console.log("MASKED EMAIL", email);
    const unmaskedEmail = unmask(email);
    console.log("UNMASED EMAIL", unmaskedEmail);
    return { city, condition: "Sunny", temperatureF: 72, email: unmaskedEmail };
  },
  toModelOutput(output) {
    return {
      type: "json",
      value: { ...output, email: mask(output.email) },
    };
  },
});
