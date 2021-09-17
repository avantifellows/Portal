import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const REGION = "ap-south-1";
const QUEUEURL = "https://sqs.ap-south-1.amazonaws.com/111766607077/EventQueue";
const sqsClient = new SQSClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.VUE_APP_AWS_SQS_ACCESS_KEY,
    secretAccessKey: process.env.VUE_APP_AWS_SQS_SECRET_ACCESS_KEY,
  },
});

async function sendSQSMessage(purpose, purposeParams, redirectTo, redirectID, userID, isUserValid, authType) {

    const messageBody = [
      {
        dateTime: new Date(),
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
          userDataValidated: isUserValid,
        },
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


export { sendSQSMessage};



