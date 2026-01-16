const amqp = require("amqplib");

async function main() {
  const conn = await amqp.connect("amqp://guest:guest@localhost:5672");
  const ch = await conn.createChannel();

  const exchange = "events";
  await ch.assertExchange(exchange, "topic", { durable: true });

  const message = {
    type: "DemoEvent",
    time: new Date().toISOString(),
    content: "Hello from Service 1"
  };

  ch.publish(
    exchange,
    "demo.event",
    Buffer.from(JSON.stringify(message))
  );

  console.log("Event published!");

  await ch.close();
  await conn.close();
}

main();