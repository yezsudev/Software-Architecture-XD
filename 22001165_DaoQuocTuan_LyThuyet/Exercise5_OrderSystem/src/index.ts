import { createApp } from './app';
const PORT = 3009;
createApp().listen(PORT, () => { console.log(`
╔════════════════════════════════════════════════════════╗
║   Exercise 5: Order System — Event Sourcing + CQRS    ║
║   Port: ${PORT}                                          ║
║                                                        ║
║   WRITE                                                ║
║   POST   /orders                → Create order         ║
║   POST   /orders/:id/items      → Add item             ║
║   DELETE /orders/:id/items/:id  → Remove item          ║
║   POST   /orders/:id/confirm    → Confirm order        ║
║   POST   /orders/:id/cancel     → Cancel order         ║
║                                                        ║
║   READ (projection)                                    ║
║   GET    /orders/:id/summary    → totalPrice, status   ║
║   GET    /orders                → All order summaries  ║
║   GET    /orders/:id/history    → Event stream         ║
╚════════════════════════════════════════════════════════╝
`); });
