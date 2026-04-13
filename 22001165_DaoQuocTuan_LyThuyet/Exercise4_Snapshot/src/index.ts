import { createApp } from './app';
const PORT = 3008;
createApp().listen(PORT, () => { console.log(`
╔═══════════════════════════════════════════════════╗
║   Exercise 4: Snapshot Optimization               ║
║   Port: ${PORT}                                     ║
║   Snapshot every: 3 events                        ║
║                                                   ║
║   GET  /accounts/:id/snapshot  → view snapshot    ║
║   POST /accounts/:id/snapshot  → force snapshot   ║
║   DEL  /accounts/:id/snapshot  → delete snapshot  ║
╚═══════════════════════════════════════════════════╝
`); });
