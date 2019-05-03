import express, { Request, Response } from 'express';
import { cacheManager } from './cache-manager';

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
  app.listen(1002, 'localhost', () => {
    console.log('Listening on port 1002');
  });
}
