import { SNSHandler } from 'aws-lambda';
import {
  DynamoDBClient,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import {
  SQSClient,
  SendMessageCommand,
} from '@aws-sdk/client-sqs';

const dynamoClient = new DynamoDBClient({});
const sqsClient = new SQSClient({});

export const handler: SNSHandler = async (event) => {
  console.log("Processing SNS record:", JSON.stringify(event));
  
  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.Sns.Message);
      const { id, date, update } = message;
      const { status, reason } = update;

      if (!["Pass", "Reject"].includes(status)) {
        console.warn("Invalid status value:", status);
        continue;
      }

      console.log(`Updating status for ${id}: ${status}, reason: ${reason}`);

      await dynamoClient.send(
        new UpdateItemCommand({
          TableName: process.env.TABLE_NAME!,
          Key: { id: { S: id } },
          UpdateExpression: "SET #s = :s, reason = :r, review_date = :d",
          ExpressionAttributeNames: {
            "#s": "status",
          },
          ExpressionAttributeValues: {
            ":s": { S: status },
            ":r": { S: reason },
            ":d": { S: date },
          },
        })
      );
      
      // 状态更新成功后，发送消息到 SQS 队列触发邮件通知
      if (process.env.STATUS_UPDATE_QUEUE_URL) {
        console.log(`Sending notification to queue: ${process.env.STATUS_UPDATE_QUEUE_URL}`);
        await sqsClient.send(
          new SendMessageCommand({
            QueueUrl: process.env.STATUS_UPDATE_QUEUE_URL,
            MessageBody: JSON.stringify({ id, update, date }),
          })
        );
      }
    } catch (error) {
      console.error("Error processing update status:", error);
    }
  }
};
