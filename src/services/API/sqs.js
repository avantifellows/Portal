import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const REGION = "ap-south-1";
const queueURL = "https://sqs.ap-south-1.amazonaws.com/111766607077/EventQueue";
const sqsClient = new SQSClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.VUE_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.VUE_APP_AWS_SECRET_KEY,
  },
});

async function sendSQSMessage(purpose, purposeParams, redirectTo, redirectID, userID, doesUserExist, authType) {
    const messageBody = [
      {
        dateTime: Date.now().toString(),
        purpose: {
          type: purpose,
          subType: purposeParams,
          params: {
            platform: redirectTo,
            id: redirectID,
          },
        },
        authType: authType,
        user: {
          values: userID,
          userDataValidated: doesUserExist,
        },
      },
    ];
    const params = {
      MessageBody: JSON.stringify(messageBody),
      QueueUrl: queueURL,
    };

    try {
      const data = await sqsClient.send(new SendMessageCommand(params));
      console.log("Success, message sent. MessageID:", data.MessageId);
    } catch (err) {
      console.log("Error", err);
    }
  }


export { sendSQSMessage};




