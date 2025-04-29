import { SNSHandler } from 'aws-lambda';
import {
  DynamoDBClient,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({});

export const handler: SNSHandler = async (event) => {
  for (const record of event.Records) {
    try {
      console.log("Processing SNS record:", JSON.stringify(record));
      
      const message = JSON.parse(record.Sns.Message);
      const { id, date, update } = message;
      const { status, reason } = update;

      if (!["Pass", "Reject"].includes(status)) {
        console.warn("Invalid status value:", status);
        continue;
      }

      console.log(`Updating status for ${id}: ${status}, reason: ${reason}`);

      await client.send(
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
    } catch (error) {
      console.error("Error processing update status:", error);
    }
  }
};
