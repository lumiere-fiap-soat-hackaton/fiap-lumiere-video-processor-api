import {
  SQSClient,
  CreateQueueCommand,
  ListQueuesCommand,
} from '@aws-sdk/client-sqs';

const sqsClient = new SQSClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:9324',
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local',
  },
});

const QUEUES = [
  'media_events_queue',
  'media_process_queue',
  'media_result_queue',
];

async function createQueues() {
  console.log('🚀 Creating SQS queues...');

  try {
    // Listar filas existentes
    const listCommand = new ListQueuesCommand({});
    const existingQueues = await sqsClient.send(listCommand);
    console.log('📋 Existing queues:', existingQueues.QueueUrls || []);

    // Criar cada fila
    for (const queueName of QUEUES) {
      const queueUrl = `http://localhost:9324/queue/${queueName}`;

      // Verificar se já existe
      if (existingQueues.QueueUrls?.includes(queueUrl)) {
        console.log(`✅ Queue already exists: ${queueName}`);
        continue;
      }

      const createCommand = new CreateQueueCommand({
        QueueName: queueName,
        Attributes: {
          VisibilityTimeout: '30', // Corrigido
          MessageRetentionPeriod: '1209600', // 14 dias
          ReceiveMessageWaitTimeSeconds: '20', // Long polling
          DelaySeconds: '0',
        },
      });

      await sqsClient.send(createCommand);
      console.log(`✅ Created queue: ${queueName}`);
    }

    console.log('🎉 All queues created successfully!');

    // Listar filas finais
    const finalList = await sqsClient.send(listCommand);
    console.log('📋 Final queue list:', finalList.QueueUrls);
  } catch (error) {
    console.error('❌ Error creating queues:', error);
    process.exit(1);
  }
}

createQueues().catch(console.error);
