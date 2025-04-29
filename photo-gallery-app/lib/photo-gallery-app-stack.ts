import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as eventsources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as path from 'path';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';



export class PhotoAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //创建 S3 bucket
    const imageBucket = new s3.Bucket(this, 'ImageBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    //  创建 SNS Topic
    const imageTopic = new sns.Topic(this, 'ImageEventTopic', {
      displayName: 'Image Event Topic',
    });

    // 配置 S3 通知发送到 SNS
    imageBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED, 
      new s3n.SnsDestination(imageTopic)
    );

    //创建 Dead Letter Queue
    const logImageDLQ = new sqs.Queue(this, 'LogImageDLQ', {
      receiveMessageWaitTime: cdk.Duration.seconds(5),
    });

    //创建 Log Image 主队列
    const logImageQueue = new sqs.Queue(this, 'LogImageQueue', {
      receiveMessageWaitTime: cdk.Duration.seconds(5),
      deadLetterQueue: {
        maxReceiveCount: 1,
        queue: logImageDLQ,
      },
    });

    //创建 Image Table
    const imageTable = new dynamodb.Table(this, 'ImageTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    //创建 Log Image Lambda 函数
    const logImageFn = new lambda.Function(this, 'LogImageFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas')),
      handler: 'logImages.handler',
      environment: {
        TABLE_NAME: imageTable.tableName,
      },
      timeout: cdk.Duration.seconds(5),
      memorySize: 128,
    });

    const removeImageFn = new lambdaNodejs.NodejsFunction(this, 'RemoveImageFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../lambdas/removeImage.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(5),
      memorySize: 128,
      bundling: {
        forceDockerBundling: false,
        esbuildVersion: '0.24.2'
      }
    });

    const addMetadataFn = new lambdaNodejs.NodejsFunction(this, 'AddMetadataFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../lambdas/addMetadata.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: imageTable.tableName,
      },
      bundling: {
        forceDockerBundling: false,
        esbuildVersion: '0.24.2'
      }
    });
    



    // SNS ➝ SQS 订阅，过滤非图片文件
    imageTopic.addSubscription(
      new subs.SqsSubscription(logImageQueue, {
        rawMessageDelivery: true,
      })
    );

    // 从 SQS 拉取消息触发
    logImageFn.addEventSource(
      new eventsources.SqsEventSource(logImageQueue, {
        batchSize: 5,
        maxBatchingWindow: cdk.Duration.seconds(5),
      })
    );

    removeImageFn.addEventSource(
      new eventsources.SqsEventSource(logImageDLQ, {
        batchSize: 5,
        maxBatchingWindow: cdk.Duration.seconds(5),
      })
    );

    imageTopic.addSubscription(
      new subs.LambdaSubscription(addMetadataFn, {
        filterPolicy: {
          metadata_type: sns.SubscriptionFilter.stringFilter({
            allowlist: ['Caption', 'Date', 'Name'],
          }),
        },
      })
    );
    
    

    // 权限
    imageTable.grantWriteData(logImageFn);
    imageBucket.grantDelete(removeImageFn);
    imageTable.grantWriteData(addMetadataFn);





    // 输出 Bucket 名 & Topic ARN
    new cdk.CfnOutput(this, 'BucketName', {
      value: imageBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'TopicARN', {
      value: imageTopic.topicArn,
    });
  }
}
