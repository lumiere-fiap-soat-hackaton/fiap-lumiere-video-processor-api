import {
  SQSClient,
  PurgeQueueCommand,
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

const QUEUE_NAMES = [
  'fiap-lumiere-source-files-events-queue',
  'fiap-lumiere-process-files-request-queue',
  'fiap-lumiere-result-files-events-queue',
];

async function purgeAllQueues() {
  console.log('🧹 Purging all SQS queues...');

  try {
    // Listar todas as filas
    const listCommand = new ListQueuesCommand({});
    const result = await sqsClient.send(listCommand);

    if (!result.QueueUrls || result.QueueUrls.length === 0) {
      console.log('📭 No queues found to purge');
      return;
    }

    console.log(`📋 Found ${result.QueueUrls.length} queues:`);
    result.QueueUrls.forEach((url) => {
      const queueName = url.split('/').pop();
      console.log(`   - ${queueName} (${url})`);
    });
    console.log('');

    // Purgar apenas nossas filas específicas
    for (const queueName of QUEUE_NAMES) {
      // Procurar a URL que termina com nosso queue name
      const queueUrl = result.QueueUrls.find((url) => url.endsWith(queueName));

      if (!queueUrl) {
        console.log(`⚠️  Queue not found: ${queueName}`);
        continue;
      }

      try {
        const purgeCommand = new PurgeQueueCommand({ QueueUrl: queueUrl });
        await sqsClient.send(purgeCommand);
        console.log(`✅ Purged queue: ${queueName}`);
      } catch (error) {
        if (error.name === 'PurgeQueueInProgress') {
          console.log(`⏳ Queue purge already in progress: ${queueName}`);
        } else {
          console.error(`❌ Failed to purge ${queueName}:`, error.message);
        }
      }
    }

    console.log('🎉 Purge operation completed!');
  } catch (error) {
    console.error('❌ Error during purge operation:', error);
    process.exit(1);
  }
}

purgeAllQueues();
