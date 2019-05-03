import express, { Request, Response } from 'express';
import { cacheManager } from './cache-manager';
import { config } from './config';

export const app = express();

app.get('*', (req : Request, res : Response) => {
  const info = cacheManager.read(req.path);
  res.json(info ? {
    success: true,
    ...info,
  } : {
    success: false,
  });
});

export function startServer() {
  app.listen(config.port, () => {
    console.log('Listening on port ' + config.port);
  });
}
