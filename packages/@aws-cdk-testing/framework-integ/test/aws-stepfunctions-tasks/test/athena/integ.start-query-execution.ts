import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as cdk from 'aws-cdk-lib';
import { AthenaStartQueryExecution, EncryptionOption } from 'aws-cdk-lib/aws-stepfunctions-tasks';

/*
 * Stack verification steps:
 * * aws stepfunctions start-execution --state-machine-arn <deployed state machine arn> : should return execution arn
 * * aws stepfunctions describe-execution --execution-arn <exection-arn generated before> : should return status as SUCCEEDED and a query-execution-id
 * * aws athena get-query-execution --query-execution-id <query-execution-id generated before> : should return QueryExecution
 */
const app = new cdk.App();
const stack = new cdk.Stack(app, 'aws-stepfunctions-tasks-athena-start-query-execution-integ');

const startQueryExecutionJob = new AthenaStartQueryExecution(stack, 'Start Athena Query', {
  queryString: sfn.JsonPath.stringAt('$.queryString'),
  queryExecutionContext: {
    databaseName: 'mydatabase',
  },
  resultConfiguration: {
    encryptionConfiguration: {
      encryptionOption: EncryptionOption.S3_MANAGED,
    },
    outputLocation: {
      bucketName: 'query-results-bucket',
      objectKey: 'folder',
    },
  },
});


const chain = sfn.Chain.start(startQueryExecutionJob);

const sm = new sfn.StateMachine(stack, 'StateMachine', {
  definition: chain,
  timeout: cdk.Duration.seconds(30),
});

new cdk.CfnOutput(stack, 'stateMachineArn', {
  value: sm.stateMachineArn,
});


app.synth();
