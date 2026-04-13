import { app } from './app';

const PORT = 3003;

const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 COMMAND SERVICE (Write Model)');
  console.log('='.repeat(60));
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Database initialized with seed data`);
  console.log(`✓ Listening to global EventBus for sync`);
  console.log('='.repeat(60) + '\n');
  console.log('📌 Endpoints:');
  console.log(`  POST   /tickets           - Book a ticket`);
  console.log(`  DELETE /tickets/:id       - Cancel a ticket`);
  console.log(`  GET    /health            - Health check`);
  console.log('='.repeat(60) + '\n');
});

server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`✗ Port ${PORT} is already in use`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});
