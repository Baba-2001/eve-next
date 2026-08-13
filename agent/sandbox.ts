import { defineSandbox, defaultBackend } from "eve/sandbox";


export default defineSandbox({
  backend: defaultBackend({
    docker: { image: "ghcr.io/vercel/eve:latest", pullPolicy: "if-not-present", networkPolicy: "allow-all" },
    microsandbox: { memoryMiB: 2048, networkPolicy: "allow-all" },
  }),
});
