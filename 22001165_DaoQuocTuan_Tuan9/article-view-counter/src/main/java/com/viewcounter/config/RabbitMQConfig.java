package com.viewcounter.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;
import org.springframework.amqp.rabbit.connection.CachingConnectionFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.backoff.ExponentialBackOffPolicy;
import org.springframework.retry.support.RetryTemplate;

@Configuration
@EnableRabbit
public class RabbitMQConfig {

    @Value("${spring.rabbitmq.host:localhost}")
    private String host;

    @Value("${spring.rabbitmq.port:5672}")
    private int port;

    @Value("${spring.rabbitmq.username:guest}")
    private String username;

    @Value("${spring.rabbitmq.password:guest}")
    private String password;

    @Value("${app.rabbitmq.exchange}")
    private String exchange;

    @Value("${app.rabbitmq.queue}")
    private String queue;

    @Value("${app.rabbitmq.routing-key}")
    private String routingKey;

    @Value("${app.rabbitmq.dead-letter-exchange}")
    private String dlx;

    @Value("${app.rabbitmq.dead-letter-queue}")
    private String dlq;

    @Value("${app.worker.batch.max-size:500}")
    private int workerBatchMaxSize;

    @Value("${app.worker.batch.flush-interval-ms:5000}")
    private long workerFlushIntervalMs;

    // ===================== Connection =====================

    @Bean
    public ConnectionFactory connectionFactory() {
        CachingConnectionFactory factory = new CachingConnectionFactory(host, port);
        factory.setUsername(username);
        factory.setPassword(password);
        factory.setChannelCacheSize(25);            // cache 25 channels
        factory.setConnectionCacheSize(5);
        factory.setRequestedHeartBeat(30);
        return factory;
    }

    // ===================== Exchanges =====================

    @Bean
    public TopicExchange viewExchange() {
        return ExchangeBuilder.topicExchange(exchange)
                .durable(true)
                .build();
    }

    @Bean
    public DirectExchange deadLetterExchange() {
        return ExchangeBuilder.directExchange(dlx)
                .durable(true)
                .build();
    }

    // ===================== Queues =====================

    @Bean
    public Queue viewQueue() {
        return QueueBuilder.durable(queue)
                .withArgument("x-dead-letter-exchange", dlx)
                .withArgument("x-dead-letter-routing-key", "dead.view")
                .withArgument("x-message-ttl", 86400000)   // 24h TTL
                .build();
    }

    @Bean
    public Queue deadLetterQueue() {
        return QueueBuilder.durable(dlq).build();
    }

    // ===================== Bindings =====================

    @Bean
    public Binding viewBinding(Queue viewQueue, TopicExchange viewExchange) {
        return BindingBuilder.bind(viewQueue).to(viewExchange).with(routingKey);
    }

    @Bean
    public Binding dlqBinding(Queue deadLetterQueue, DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(deadLetterQueue).to(deadLetterExchange).with("dead.view");
    }

    // ===================== Template + Retry =====================

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());

        // Retry policy: 3 attempts, exponential backoff 500ms → 5s
        RetryTemplate retry = new RetryTemplate();
        ExponentialBackOffPolicy backOff = new ExponentialBackOffPolicy();
        backOff.setInitialInterval(500);
        backOff.setMultiplier(2.0);
        backOff.setMaxInterval(5000);
        retry.setBackOffPolicy(backOff);
        template.setRetryTemplate(retry);

        // Publisher confirms for reliability
        template.setMandatory(true);

        return template;
    }

    @Bean
    public RabbitAdmin rabbitAdmin(ConnectionFactory connectionFactory) {
        return new RabbitAdmin(connectionFactory);
    }

    /**
     * Worker batch settings:
     * - Flush when batch reaches max-size
     * - Or flush when receive-timeout elapsed (time window)
     */
    @Bean(name = "batchListenerContainerFactory")
    public SimpleRabbitListenerContainerFactory batchListenerContainerFactory(ConnectionFactory connectionFactory) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(jsonMessageConverter());
        factory.setBatchListener(true);
        factory.setConsumerBatchEnabled(true);
        factory.setBatchSize(workerBatchMaxSize);
        factory.setReceiveTimeout(workerFlushIntervalMs);
        factory.setPrefetchCount(workerBatchMaxSize * 2);
        factory.setDefaultRequeueRejected(true);
        return factory;
    }
}
