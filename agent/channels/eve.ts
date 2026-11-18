import { eveChannel } from "eve/channels/eve";
import { none } from "eve/channels/auth";

export default eveChannel({
  // This local Docker deployment has no login layer; add real auth before
  // exposing the agent outside a trusted environment.
  auth: [none()],
});
