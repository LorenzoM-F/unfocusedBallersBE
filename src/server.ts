import app from "./app";
import { config } from "./config";

app.listen(config.port, "127.0.0.1", () => {
  console.log(`API listening on ${config.port}`);
});
