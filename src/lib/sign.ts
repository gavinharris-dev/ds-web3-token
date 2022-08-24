import * as dayJs from 'dayjs';

export type DataSignature = {
  signature: string;
  key: string;
};

type Signer = (message: string) => Promise<string | DataSignature>;
export type Token = {
  body: string;
  signature: string;
  key?: string;
};

export async function sign(signer: Signer, requester: string, ttlMins: number = 2) {
  const expiry = dayJs().add(ttlMins, 'minute').toISOString();
  const message = `
 Web3-Token-Version: 1
 Expires: ${expiry}
 Requested by: ${requester}
`;

  const signedMsg = await signer(message);
  const result: Partial<Token> = {
    body: Buffer.from(message).toString('hex'),
  };

  if (typeof signedMsg === 'string') {
    result.signature = signedMsg;
  } else {
    result.signature = signedMsg.signature;
    result.key = signedMsg.key;
  }

  return Buffer.from(JSON.stringify(result)).toString('base64');
}
