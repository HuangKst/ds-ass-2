import { SQSHandler } from "aws-lambda";
import {
  S3Client,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const s3 = new S3Client();

export const handler: SQSHandler = async (event) => {
  console.log("DLQ Event:", JSON.stringify(event));

  for (const record of event.Records) {
    const s3Event = JSON.parse(record.body); // rawMessageDelivery = true
    const s3Record = s3Event.Records[0].s3;
    const bucket = s3Record.bucket.name;
    const key = decodeURIComponent(s3Record.object.key.replace(/\+/g, " "));

    try {
      console.log(`Deleting invalid file: s3://${bucket}/${key}`);
      await s3.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
    } catch (error) {
      console.error("Failed to delete file:", error);
    }
  }
};
