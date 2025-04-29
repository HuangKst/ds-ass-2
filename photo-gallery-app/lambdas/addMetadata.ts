import { SNSHandler } from "aws-lambda";
import {
  DynamoDBClient,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({});

export const handler: SNSHandler = async (event) => {
  console.log("Metadata Event:", JSON.stringify(event));

  for (const record of event.Records) {
    try {
      const metadataType = record.Sns.MessageAttributes?.metadata_type?.Value;

      if (!["Caption", "Date", "Name"].includes(metadataType)) {
        console.warn("Invalid metadata type:", metadataType);
        continue;
      }

      const message = JSON.parse(record.Sns.Message);
      const { id, value } = message;

      const updateKey = metadataType.toLowerCase(); // 转换为DynamoDB字段名

      console.log(`Updating image ${id}: ${updateKey} = ${value}`);

      await client.send(
        new UpdateItemCommand({
          TableName: process.env.TABLE_NAME!,
          Key: { id: { S: id } },
          UpdateExpression: `SET #attr = :v`,
          ExpressionAttributeNames: {
            "#attr": updateKey
          },
          ExpressionAttributeValues: {
            ":v": { S: value },
          },
        })
      );
    } catch (error) {
      console.error("Error processing metadata:", error);
    }
  }
};