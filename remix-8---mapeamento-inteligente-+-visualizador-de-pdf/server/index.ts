import dotenv from 'dotenv';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { createAIApp } from './ai.ts';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });
const app = createAIApp(process.env);
const dist = fileURLToPath(new URL('../dist', import.meta.url));
app.use(express.static(dist));
app.get('*', (_req, res) => res.sendFile(`${dist}/index.html`));
const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`Próximo Acerto disponível na porta ${port}`));
