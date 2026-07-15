export type MultipartPart =
  | { name: string; value: string }
  | { name: string; filename: string; contentType: string; bytes: Uint8Array };

export interface MultipartPayload {
  body: Uint8Array;
  contentType: string;
}

export function createMultipartPayload(
  parts: MultipartPart[],
  boundary = `brickval-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
): MultipartPayload {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const appendText = (value: string) => chunks.push(encoder.encode(value));

  for (const part of parts) {
    appendText(`--${boundary}\r\n`);
    if ("value" in part) {
      appendText(`content-disposition: form-data; name="${escapeHeaderValue(part.name)}"\r\n\r\n`);
      appendText(part.value);
    } else {
      appendText(
        `content-disposition: form-data; name="${escapeHeaderValue(part.name)}"; filename="${escapeHeaderValue(part.filename)}"\r\n`
      );
      appendText(`content-type: ${part.contentType}\r\n\r\n`);
      chunks.push(part.bytes);
    }
    appendText("\r\n");
  }
  appendText(`--${boundary}--\r\n`);

  const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

function escapeHeaderValue(value: string): string {
  return value.replace(/["\r\n]/g, "_");
}
