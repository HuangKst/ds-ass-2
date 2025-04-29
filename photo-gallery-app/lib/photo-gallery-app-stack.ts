import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';

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

    // 输出 Bucket 名 & Topic ARN
    new cdk.CfnOutput(this, 'BucketName', {
      value: imageBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'TopicARN', {
      value: imageTopic.topicArn,
    });
  }
}
