import express, { Request, Response } from 'express';
import { CachedFileInfo, cacheManager } from './cache-manager';
import { config } from './config';
import { urlencoded, json } from 'body-parser';

export const app = express();

app.use(urlencoded({
  extended: true,
}));
app.use(json());

app.get('*', (req : Request, res : Response) => {
  res.json(parseInfo(
    cacheManager.read(req.path, config.defaultDevice),
  ));
});

app.post('*', (req : Request, res : Response) => {
  res.json(parseInfo(
    cacheManager.read(req.path, req.body && req.body.deviceName || config.defaultDevice),
  ));
});

function parseInfo (info? : CachedFileInfo) {
  return info ? {
    success: true,
    ...info,
  } : {
    success: false,
  };
}

export function startServer () {
  app.listen(config.port, config.host, () => {
    console.log(`Listening at ${ config.host }:${ config.port }`);
  });
}
