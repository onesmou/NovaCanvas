import next from 'next';
import { createServer } from 'node:http';

const port = Number(process.env.PORT || 3001);
const hostname = process.env.HOSTNAME || '127.0.0.1';
const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();
createServer((req, res) => handle(req, res)).listen(port, hostname, () => {
  console.log(`NovaCanvas listening on http://${hostname}:${port}`);
});
