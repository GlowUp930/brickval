import { createSign } from "node:crypto";
import { connect } from "node:http2";

type APNsEnvironment = "sandbox" | "production";

type APNsResult = {
  statusCode: number;
  reason?: string;
};

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function createProviderToken(): string {
  const keyID = process.env.APNS_KEY_ID;
  const teamID = process.env.APNS_TEAM_ID;
  const privateKey = process.env.APNS_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!keyID || !teamID || !privateKey) throw new Error("APNs credentials are not configured");

  const header = base64url(JSON.stringify({ alg: "ES256", kid: keyID }));
  const payload = base64url(JSON.stringify({ iss: teamID, iat: Math.floor(Date.now() / 1000) }));
  const unsignedToken = `${header}.${payload}`;
  const signature = createSign("sha256")
    .update(unsignedToken)
    .sign({ key: privateKey, dsaEncoding: "ieee-p1363" });
  return `${unsignedToken}.${base64url(signature)}`;
}

function apnsHost(environment: APNsEnvironment): string {
  return environment === "sandbox" ? "api.sandbox.push.apple.com" : "api.push.apple.com";
}

export async function sendAPNsAlert(input: {
  token: string;
  environment: APNsEnvironment;
  title: string;
  body: string;
  deepLink: string;
  category: string;
}): Promise<APNsResult> {
  const bundleID = process.env.APNS_BUNDLE_ID ?? "com.brickval.app";
  const providerToken = createProviderToken();
  const client = connect(`https://${apnsHost(input.environment)}`);

  return new Promise((resolve, reject) => {
    let responseBody = "";
    let settled = false;
    const finish = (result: APNsResult | Error) => {
      if (settled) return;
      settled = true;
      client.close();
      if (result instanceof Error) reject(result);
      else resolve(result);
    };

    client.once("error", (error) => finish(error));
    const request = client.request({
      ":method": "POST",
      ":path": `/3/device/${input.token}`,
      authorization: `bearer ${providerToken}`,
      "apns-topic": bundleID,
      "apns-push-type": "alert",
      "apns-priority": "10",
    });

    request.setEncoding("utf8");
    request.on("data", (chunk: string) => { responseBody += chunk; });
    request.on("response", (headers) => {
      const statusCode = Number(headers[":status"] ?? 500);
      request.once("end", () => {
        let reason: string | undefined;
        try { reason = JSON.parse(responseBody).reason; } catch { /* no JSON body */ }
        finish({ statusCode, reason });
      });
    });
    request.once("error", (error) => finish(error));
    request.end(JSON.stringify({
      aps: {
        alert: { title: input.title, body: input.body },
        sound: "default",
      },
      deepLink: input.deepLink,
      category: input.category,
    }));
  });
}
