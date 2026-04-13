import { createApp } from './app';

const app = createApp();
const PORT = 3006;
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║   Exercise 2: Time Travel / Undo                  ║
║   Port: ${PORT}                                     ║
║                                                   ║
║   GET  /accounts/:id/state/:index  → past state   ║
║   GET  /accounts/:id/timeline      → evolution    ║
║   DELETE /accounts/:id/undo        → undo last    ║
╚═══════════════════════════════════════════════════╝
  `);
});
