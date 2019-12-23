import { Transform, TransformCallback } from "stream";

export const MATCH_NON_PRINTABLE = /[^\000-\031]+/gi;

export default class StreamCleaner extends Transform {
  constructor(private readonly pattern: RegExp) {
    super();
  }
  _transform(chunk: any, encoding: string, cb: TransformCallback) {
    const result = chunk.toString().replace(this.pattern, "");
    this.push(result);
    cb();
  }
}
