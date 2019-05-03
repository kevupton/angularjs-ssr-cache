import { Request, Response } from 'express';
import { cacheManager } from './cache-manager';
import { app } from './server';

app.get('*', (req : Request, res : Response) => {
  console.log(req.path);
  const info = cacheManager.read(req.path);
  res.json(info ? {
    success: true,
    ...info,
  } : {
    success: false,
  });
});
