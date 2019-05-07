import { json, urlencoded } from 'body-parser';
import express, { Request, Response } from 'express';
import { CachedFileInfo, cacheManager } from './cache-manager';
import { config } from './config';
import { logger } from './logger';

export const app = express();

app.use(urlencoded({
  extended: true,
}));

app.use(json());

app.get('*', (req : Request, res : Response) => {
  logger.debug(`REQUEST - ${ req.path }`);
  cacheManager.read(req.path, config.defaultDevice).subscribe(content => {
    res.json(parseInfo(content));
  });
});

app.post('*', (req : Request, res : Response) => {
  logger.debug(`REQUEST - [${ req.body.deviceName }] : ${ req.path }`);
  const deviceName = req.body && req.body.deviceName || config.defaultDevice;
  cacheManager.read(req.path, deviceName).subscribe(content => {
    res.json(parseInfo(content));
  });
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
    logger.log(`Listening at ${ config.host }:${ config.port }`);
  });
}
