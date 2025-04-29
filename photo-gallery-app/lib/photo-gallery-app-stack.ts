import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
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


    // SNS ➝ SQS 订阅，过滤非图片文件
    imageTopic.addSubscription(
      new subs.SqsSubscription(logImageQueue, {
        rawMessageDelivery: true,
        filterPolicy: {
          suffix: sns.SubscriptionFilter.stringFilter({
            allowlist: ['.jpeg', '.png'],
          }),
        },
      })
    );



    // 输出 Bucket 名 & Topic ARN
    new cdk.CfnOutput(this, 'BucketName', {
      value: imageBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'TopicARN', {
      value: imageTopic.topicArn,
    });
  }
}
