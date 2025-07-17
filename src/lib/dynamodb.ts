import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

let docClient: DynamoDBDocumentClient | null = null;

export const getDocClient = (): DynamoDBDocumentClient | null => {
  if (docClient) {
    return docClient;
  }

  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    console.error("AWS credentials or region are not configured in environment variables.");
    return null;
  }
  
  try {
    const client = new DynamoDBClient({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });
    
    docClient = DynamoDBDocumentClient.from(client);
    return docClient;

  } catch (error) {
    console.error("Failed to initialize DynamoDB client:", error);
    return null;
  }
};
