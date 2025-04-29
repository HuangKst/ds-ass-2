import { SQSHandler } from "aws-lambda";
import {
  DynamoDBClient,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({});

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    const body = JSON.parse(record.body);
    const fileName = body.Records[0].s3.object.key;

    if (!fileName.endsWith(".jpeg") && !fileName.endsWith(".png")) {
      throw new Error("Invalid file type");
    }

    console.log("Logging image to DB:", fileName);
    await client.send(
      new PutItemCommand({
        TableName: process.env.TABLE_NAME!,
        Item: {
          id: { S: fileName },
        },
      })
    );
  }
};
