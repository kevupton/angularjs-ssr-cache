import express from 'express';

export const app = express();

export function startServer() {
  app.listen(1002, 'localhost', () => {
    console.log('Listening on port 1002');
  });
}
