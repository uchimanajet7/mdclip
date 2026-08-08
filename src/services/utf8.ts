type StrictUtf8Decoder = InstanceType<typeof TextDecoder>;
type TextDecoderInput = Parameters<StrictUtf8Decoder["decode"]>[0];
type TextDecoderOptions = Parameters<StrictUtf8Decoder["decode"]>[1];

export class InvalidUtf8Error extends Error {
  constructor(cause: unknown) {
    super("MdClip could not decode Markdown content as UTF-8.", { cause });
    this.name = "InvalidUtf8Error";
  }
}

export function createStrictUtf8Decoder(): StrictUtf8Decoder {
  return new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });
}

export function decodeUtf8Chunk(
  decoder: StrictUtf8Decoder,
  input?: TextDecoderInput,
  options?: TextDecoderOptions,
): string {
  try {
    return decoder.decode(input, options);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new InvalidUtf8Error(error);
    }

    throw error;
  }
}

export function decodeUtf8(input: TextDecoderInput): string {
  return decodeUtf8Chunk(createStrictUtf8Decoder(), input);
}
