import { app } from './app';

const PORT = 3004;

const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 QUERY SERVICE (Read Model)');
  console.log('='.repeat(60));
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Database initialized with seed data`);
  console.log(`✓ Listening to global EventBus for updates`);
  console.log(`✓ Maintaining eventual consistency with CommandService`);
  console.log('='.repeat(60) + '\n');
  console.log('📌 Endpoints:');
  console.log(`  GET    /trips/search?from=X&to=Y - Search trips`);
  console.log(`  GET    /tickets                    - Get all tickets`);
  console.log(`  GET    /tickets/:id                - Get ticket detail`);
  console.log(`  GET    /health                     - Health check`);
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
