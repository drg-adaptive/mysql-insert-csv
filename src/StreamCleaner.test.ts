import { Readable } from "stream";
import StreamCleaner, { MATCH_NON_PRINTABLE } from "./StreamCleaner";

describe("StreamCleaner", () => {
  test("remove non-printable characters", () => {
    const source = new Readable();

    const transform = new StreamCleaner(MATCH_NON_PRINTABLE);

    source
      .pipe(transform)
      .on("data", chunk =>
        expect(chunk.toString()).not.toMatch(MATCH_NON_PRINTABLE)
      );

    for (let i = 0; i <= 31; i++) {
      source.push(String.fromCharCode(i));
    }
    source.push(null);
  });
});
