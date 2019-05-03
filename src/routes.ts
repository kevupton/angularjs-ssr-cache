import { Request, Response } from 'express';
import { app } from './server';

app.get('*', (req : Request, res : Response) => {
  console.log(req.path);
  res.json({ success: true, cachedAt: 'date', content: '<html></html>'})
});
