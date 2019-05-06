import express, { Request, Response } from 'express';
import { CachedFileInfo, cacheManager } from './cache-manager';
import { config, DEFAULT_DEVICE_NAME } from './config';

export const app = express();

app.get('*', (req : Request, res : Response) => {
  res.json(parseInfo(
    cacheManager.read(req.path, DEFAULT_DEVICE_NAME),
  ));
});

app.post('*', (req : Request, res : Response) => {
  res.json(parseInfo(
    cacheManager.read(req.path, req.body && req.body.deviceName || DEFAULT_DEVICE_NAME),
  ));
});

function parseInfo(info? : CachedFileInfo) {
  return info ? {
    success: true,
    ...info,
  } : {
    success: false,
  }
}

export function startServer () {
  app.listen(config.port, config.host, () => {
    console.log(`Listening at ${ config.host }:${ config.port }`);
  });
}
