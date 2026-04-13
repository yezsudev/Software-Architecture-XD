import { createApp } from './app';

const PORT = process.env.PORT || 3002;
const app = createApp();

app.listen(PORT, () => {
  console.log(`
╔═════════════════════════════════════════╗
║   Train Ticket System Server Started    ║
╚═════════════════════════════════════════╝

Host: http://localhost:${PORT}
Health: http://localhost:${PORT}/health

API Endpoints:

Commands (Write Operations):
  POST   /tickets         - Book a ticket
  DELETE /tickets/:id     - Cancel a ticket

Queries (Read Operations):
  GET    /trips/search    - Search trips (?from=Bangkok&to=Chiang%20Mai)
  GET    /tickets         - Get all tickets (?tripId=TRIP001)
  GET    /tickets/:id     - Get ticket details

Architecture:
  • TicketService (CommandService) - Book & Cancel
  • TicketViewService (QueryService) - Search & Get
  • Database Layer - Persistence
  • SeatValidator - Business Logic
  • EventBus - Event-Driven Sync
  `);
});
