import assert from "node:assert/strict";
import test from "node:test";

import { createMultipartPayload } from "../lib/multipart";

test("multipart image payload contains a valid file part without FormData", () => {
  const payload = createMultipartPayload(
    [
      {
        name: "image",
        filename: "scan.jpg",
        contentType: "image/jpeg",
        bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      },
    ],
    "brickval-test-boundary"
  );

  assert.equal(payload.contentType, "multipart/form-data; boundary=brickval-test-boundary");
  const text = new TextDecoder("latin1").decode(payload.body);
  assert.match(text, /name="image"; filename="scan.jpg"/);
  assert.match(text, /content-type: image\/jpeg/i);
  assert.equal(text.endsWith("\r\n--brickval-test-boundary--\r\n"), true);
});

test("multipart payload supports fields and repeated image names", () => {
  const payload = createMultipartPayload(
    [
      { name: "manifest", value: "{\"regions\":[]}" },
      { name: "images", filename: "one.jpg", contentType: "image/jpeg", bytes: new Uint8Array([1]) },
      { name: "images", filename: "two.jpg", contentType: "image/jpeg", bytes: new Uint8Array([2]) },
    ],
    "bulk-boundary"
  );
  const text = new TextDecoder("latin1").decode(payload.body);

  assert.match(text, /name="manifest"/);
  assert.equal((text.match(/name="images"/g) ?? []).length, 2);
});
