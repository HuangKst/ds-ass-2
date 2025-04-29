## Distributed Systems - Event-Driven Architecture.

__Name:__ Zihan Huang

__Demo__: 

This repository contains the implementation of a skeleton design for an application that manages a photo gallery, illustrated below. The app uses an event-driven architecture and is deployed on the AWS platform using the CDK framework for infrastructure provisioning.

![](./images/arch.png)

### Code Status.

All features have been implemented according to the specification, with proper event filtering and error handling.

__Feature:__
+ Photographer:
  + Log new Images - Completed & Tested
  + Metadata updating - Completed & Tested
  + Invalid image removal - Completed & Tested
  + Status Update Mailer - Completed & Tested
+ Moderator:
  + Status updating - Completed & Tested

### Architecture Implementation

This application was implemented using AWS CDK with the following components:

1. **S3 Bucket**: For storing uploaded images
2. **SNS Topic**: Central event hub for all application messages
3. **DynamoDB Table**: For storing image metadata and status information
4. **SQS Queues**: For message buffering and error handling (including Dead Letter Queue)
5. **Lambda Functions**:
   - LogImageFn: Records valid image uploads to DynamoDB
   - RemoveImageFn: Deletes invalid files from S3
   - AddMetadataFn: Updates image metadata in DynamoDB
   - UpdateStatusFn: Updates image status and triggers notifications
   - MailerFn: Sends status update emails to photographers

### Event Filtering

Each component uses appropriate filtering to ensure it only processes relevant events:

- Image processing is filtered by file type (.jpeg and .png only)
- Metadata updates are filtered by metadata_type attribute
- Status updates trigger database changes and email notifications
- Invalid files are automatically removed via the DLQ mechanism

### Testing

The project includes a comprehensive test suite for validating all components of the system. Below are the test commands and procedures for verifying each feature.

#### Deployment Output
```
Outputs:
PhotoAppStack.BucketName = photoappstack-imagebucket97210811-ckrha97wkscl
PhotoAppStack.TopicARN = arn:aws:sns:eu-west-1:209479262118:PhotoAppStack-ImageEventTopic73746663-NUb4SNecpQO3
Stack ARN:
arn:aws:cloudformation:eu-west-1:209479262118:stack/PhotoAppStack/96cde090-250e-11f0-b3cc-06119d8a3ab9
```

#### Test Commands

1. **Test Valid Image Upload**
   ```
   # Upload a valid image file to S3 bucket
   aws s3 cp sunflower.jpeg s3://photoappstack-imagebucket97210811-ckrha97wkscl/
   ```

2. **Test Invalid File Upload** (should be rejected and deleted)
   ```
   # Upload an invalid file type to S3 bucket
   aws s3 cp test.txt s3://photoappstack-imagebucket97210811-ckrha97wkscl/
   ```

3. **Test Name Metadata Addition**
   ```
   # Send name metadata to the SNS topic
   aws sns publish --topic-arn "arn:aws:sns:eu-west-1:209479262118:PhotoAppStack-ImageEventTopic73746663-NUb4SNecpQO3" --message-attributes file://tests/attributes-name.json --message file://tests/metadata-name.json
   ```

4. **Test Caption Metadata Addition**
   ```
   # Send caption metadata to the SNS topic
   aws sns publish --topic-arn "arn:aws:sns:eu-west-1:209479262118:PhotoAppStack-ImageEventTopic73746663-NUb4SNecpQO3" --message-attributes file://tests/attributes-caption.json --message file://tests/metadata-caption.json
   ```

5. **Test Date Metadata Addition**
   ```
   # Send date metadata to the SNS topic
   aws sns publish --topic-arn "arn:aws:sns:eu-west-1:209479262118:PhotoAppStack-ImageEventTopic73746663-NUb4SNecpQO3" --message-attributes file://tests/attributes-date.json --message file://tests/metadata-date.json
   ```

6. **Test Status Update (Approval)**
   ```
   # Send approval status update to the SNS topic
   aws sns publish --topic-arn "arn:aws:sns:eu-west-1:209479262118:PhotoAppStack-ImageEventTopic73746663-NUb4SNecpQO3" --message file://tests/status-update-pass.json
   ```

7. **Test Status Update (Rejection)**
   ```
   # Send rejection status update to the SNS topic
   aws sns publish --topic-arn "arn:aws:sns:eu-west-1:209479262118:PhotoAppStack-ImageEventTopic73746663-NUb4SNecpQO3" --message file://tests/status-update-reject.json
   ```

#### Verification Steps
1. Log into AWS Console to check records in the DynamoDB table
2. Check CloudWatch log groups for execution logs of each Lambda function
3. Check your email inbox for status update notifications
4. Verify that invalid files were correctly deleted from S3

### Notes

- Email notifications require SES verified email addresses
- The application demonstrates proper error handling and recovery
- All components are configured with appropriate IAM permissions
- The system follows AWS best practices for serverless event-driven architectures
