import { defineTool } from "eve/tools";
import { z } from "zod";

// The model sees this tool as `get_weather`, from the filename.
export default defineTool({
  description: "Get the current weather for a city.",
  inputSchema: z.object({ city: z.string().min(1), email: z.string() }),
  async execute({ city, email }) {
    return { city, condition: "Sunny", temperatureF: 72, email };
  },
});
