import { createApp } from './app';
const PORT = 3007;
createApp().listen(PORT, () => { console.log(`
╔═══════════════════════════════════════════════════╗
║   Exercise 3: Projection (Read Model)             ║
║   Port: ${PORT}                                     ║
║                                                   ║
║   WRITE: /accounts/:id/deposit|withdraw           ║
║   READ:  /accounts/:id/summary  (projection)      ║
║   ALL:   /accounts/summaries/all                  ║
╚═══════════════════════════════════════════════════╝
`); });
