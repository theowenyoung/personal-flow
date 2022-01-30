const decoder = new TextDecoder();

export interface GetStdinOptions {
  /**
   * If `true`, stop reading the stdin once a newline char is reached
   * @default true
   */
  exitOnEnter?: boolean;
}

/**
 * Returns an Uint8Array from standard input
 */
export async function getStdinBuffer(
  options: GetStdinOptions = {}
): Promise<Uint8Array> {
  const bytes: number[] = [];

  while (true) {
    // Read bytes one by one
    const buffer = new Uint8Array(1);
    const readStatus = await Deno.stdin.read(buffer);

    // Found EOL
    if (readStatus === null || readStatus === 0) {
      break;
    }

    const byte = buffer[0];

    // On Enter, exit if we are supposed to
    if (byte === 10 && options.exitOnEnter !== false) {
      break;
    }

    bytes.push(byte);
  }

  return Uint8Array.from(bytes);
}

/**
 * Returns a string from standard input
 */
export async function getStdin(options: GetStdinOptions = {}): Promise<string> {
  const buffer = await getStdinBuffer(options);

  return decoder.decode(buffer);
}

/**
 * Returns an Uint8Array from standard input in sync mode
 */
export function getStdinBufferSync(options: GetStdinOptions = {}): Uint8Array {
  const bytes: number[] = [];

  while (true) {
    // Read bytes one by one
    const buffer = new Uint8Array(1);
    const readStatus = Deno.stdin.readSync(buffer);

    // Found EOL
    if (readStatus === null || readStatus === 0) {
      break;
    }

    const byte = buffer[0];

    // On Enter, exit if we are supposed to
    if (byte === 10 && options.exitOnEnter !== false) {
      break;
    }

    bytes.push(byte);
  }

  return Uint8Array.from(bytes);
}

/**
 * Returns a string from standard input in sync mode
 */
export function getStdinSync(options: GetStdinOptions = {}): string {
  const buffer = getStdinBufferSync(options);

  return decoder.decode(buffer);
}
