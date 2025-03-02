import * as path from 'path';
import { Template } from '../../assertions';
import * as lambda from '../../aws-lambda';
import * as cdk from '../../core';
import * as appsync from '../lib';

let stack: cdk.Stack;
let api: appsync.GraphqlApi;

beforeEach(() => {
  // GIVEN
  stack = new cdk.Stack();
  api = new appsync.GraphqlApi(stack, 'api', {
    name: 'api',
    schema: appsync.SchemaFile.fromAsset(path.join(__dirname, 'appsync.lambda.graphql')),
  });
});

describe('Lambda Mapping Templates', () => {
  // GIVEN
  let func: lambda.Function;
  const invokeMT = '{"version": "2017-02-28", "operation": "Invoke", "payload": $util.toJson($ctx)}';
  const batchMT = '{"version": "2017-02-28", "operation": "BatchInvoke", "payload": $util.toJson($ctx)}';

  beforeEach(() => {
    func = new lambda.Function(stack, 'func', {
      code: lambda.Code.fromAsset(path.join(__dirname, 'verify/lambda-tutorial')),
      handler: 'lambda-tutorial.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
    });
  });

  test('Lambda request default operation is "Invoke"', () => {
    // WHEN
    const lambdaDS = api.addLambdaDataSource('LambdaDS', func);

    lambdaDS.createResolver('QueryAllPosts', {
      typeName: 'Query',
      fieldName: 'allPosts',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    // THEN
    Template.fromStack(stack).hasResourceProperties('AWS::AppSync::Resolver', {
      FieldName: 'allPosts',
      RequestMappingTemplate: invokeMT,
    });
  });

  test('Lambda request supports "BatchInvoke" through custom operation', () => {
    // WHEN
    const lambdaDS = api.addLambdaDataSource('LambdaDS', func);

    lambdaDS.createResolver('PostRelatedPosts', {
      typeName: 'Post',
      fieldName: 'relatedPosts',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest('$util.toJson($ctx)', 'BatchInvoke'),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
      maxBatchSize: 10,
    });

    // THEN
    Template.fromStack(stack).hasResourceProperties('AWS::AppSync::Resolver', {
      FieldName: 'relatedPosts',
      RequestMappingTemplate: batchMT,
      MaxBatchSize: 10,
    });
  });
});
