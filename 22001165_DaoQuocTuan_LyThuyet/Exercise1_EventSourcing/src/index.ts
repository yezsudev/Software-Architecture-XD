import { createApp } from './app';

const PORT = 3005;

const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   Bank Account Event Sourcing Service                      ║
║   Port: ${PORT}                                              ║
║   Pattern: EVENT SOURCING                                  ║
║                                                            ║
║   State = replay(events)                                   ║
║   Balance = sum(deposits) - sum(withdrawals)               ║
║                                                            ║
║   Every transaction is an immutable event                  ║
║   Current state is computed on-demand                      ║
╚════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
