const amqp = require("amqplib");

async function main() {
  const conn = await amqp.connect("amqp://guest:guest@localhost:5672");
  const ch = await conn.createChannel();

  const exchange = "events";
  const queue = "service2.demo.queue";

  await ch.assertExchange(exchange, "topic", { durable: true });
  await ch.assertQueue(queue, { durable: true });
  await ch.bindQueue(queue, exchange, "demo.*");

  console.log("Service 2 is waiting for messages...");

  ch.consume(queue, (msg) => {
    const data = JSON.parse(msg.content.toString());
    console.log("Received event:", data);

    ch.ack(msg);
  });
}

main();
