import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const REGION = import.meta.env.VITE_APP_AWS_REGION;
const QUEUEURL = import.meta.env.VITE_APP_AWS_SQS_URL;
const sqsClient = new SQSClient({
  region: REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_APP_AWS_SECRET_KEY,
  },
});

/** This function is used to send an SQS message to the queue on AWS.
 * @param {String} purpose
 * @param {String} purposeParams
 * @param {String} redirectTo
 * @param {String} redirectId
 * @param {Array} userIDList - list of users wanting to go through the layer
 * @param {String} authType
 * Everything, except the userIDList, is extracted from the auth layer URL
 */

export async function sendSQSMessage(
  purpose,
  purposeParams,
  redirectTo,
  redirectId,
  userIDList,
  authType,
  groupName,
  userType,
  sessionId
) {
  const messageBody = [
    {
      dateTime: new Date(),
      purpose: {
        type: purpose,
        subType: purposeParams,
        params: {
          platform: redirectTo,
          id: redirectId,
        },
      },
      authType: authType,
      user: {
        values: userIDList,
      },
      group: groupName,
      userType: userType,
      sessionId: sessionId,
    },
  ];
  const params = {
    MessageBody: JSON.stringify(messageBody),
    QueueUrl: QUEUEURL,
  };

  try {
    const data = await sqsClient.send(new SendMessageCommand(params));
    console.log("Success, message sent. MessageID:", data.MessageId);
  } catch (err) {
    console.log("Error", err);
  }
}
