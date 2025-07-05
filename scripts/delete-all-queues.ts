import {
  SQSClient,
  DeleteQueueCommand,
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

async function deleteAllQueues() {
  console.log('🗑️  Deleting all SQS queues...');

  try {
    const listCommand = new ListQueuesCommand({});
    const result = await sqsClient.send(listCommand);

    if (!result.QueueUrls || result.QueueUrls.length === 0) {
      console.log('📭 No queues found to delete');
      return;
    }

    console.log(`📋 Found ${result.QueueUrls.length} queues to delete`);

    for (const queueUrl of result.QueueUrls) {
      const queueName = queueUrl.split('/').pop();

      try {
        const deleteCommand = new DeleteQueueCommand({ QueueUrl: queueUrl });
        await sqsClient.send(deleteCommand);
        console.log(`🗑️  Deleted queue: ${queueName}`);
      } catch (error) {
        console.error(`❌ Failed to delete ${queueName}:`, error.message);
      }
    }

    console.log('🎉 All queues deleted!');
  } catch (error) {
    console.error('❌ Error deleting queues:', error);
  }
}

deleteAllQueues();
