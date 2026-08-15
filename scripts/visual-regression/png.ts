import { createHash } from "node:crypto";
import { deflateSync, inflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export type RgbaImage = Readonly<{
  width: number;
  height: number;
  data: Uint8Array;
}>;

const crcTable = new Uint32Array(256);
for (let index = 0; index < 256; index++) {
  let value = index;
  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crcTable[index] = value >>> 0;
}

const crc32 = (input: Uint8Array) => {
  let value = 0xffffffff;
  for (const byte of input) {
    value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
};

const chunk = (name: string, data: Uint8Array) => {
  const type = Buffer.from(name, "ascii");
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length, 0);
  type.copy(result, 4);
  Buffer.from(data).copy(result, 8);
  result.writeUInt32BE(
    crc32(Buffer.concat([type, Buffer.from(data)])),
    data.length + 8,
  );
  return result;
};

const paeth = (a: number, b: number, c: number) => {
  const prediction = a + b - c;
  const distanceA = Math.abs(prediction - a);
  const distanceB = Math.abs(prediction - b);
  const distanceC = Math.abs(prediction - c);
  return distanceA <= distanceB && distanceA <= distanceC
    ? a
    : distanceB <= distanceC
    ? b
    : c;
};

export const decodePng = (input: Uint8Array): RgbaImage => {
  const buffer = Buffer.from(input);
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error("Invalid PNG signature");
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  let ended = false;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    const expectedCrc = buffer.readUInt32BE(offset + 8 + length);
    const actualCrc = crc32(buffer.subarray(offset + 4, offset + 8 + length));
    if (expectedCrc !== actualCrc) {
      throw new Error(`Corrupt PNG chunk: ${type}`);
    }
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[10] !== 0 || data[11] !== 0 || data[12] !== 0) {
        throw new Error(
          "Unsupported PNG compression, filter, or interlace mode",
        );
      }
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      ended = true;
      break;
    }
    offset += length + 12;
  }
  if (
    !ended ||
    !width ||
    !height ||
    bitDepth !== 8 ||
    (colorType !== 2 && colorType !== 6) ||
    !idat.length
  ) {
    throw new Error(
      "Only complete non-interlaced 8-bit RGB/RGBA PNG images are supported",
    );
  }
  const channels = colorType === 2 ? 3 : 4;
  const stride = width * channels;
  const inflated = inflateSync(Buffer.concat(idat));
  if (inflated.length !== height * (stride + 1)) {
    throw new Error("PNG scanline dimensions do not match IHDR");
  }
  const decoded = new Uint8Array(width * height * channels);
  for (let y = 0; y < height; y++) {
    const filter = inflated[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const encoded = inflated[y * (stride + 1) + x + 1];
      const outputIndex = y * stride + x;
      const left = x >= channels ? decoded[outputIndex - channels] : 0;
      const above = y > 0 ? decoded[outputIndex - stride] : 0;
      const upperLeft =
        y > 0 && x >= channels ? decoded[outputIndex - stride - channels] : 0;
      let value: number;
      switch (filter) {
        case 0:
          value = encoded;
          break;
        case 1:
          value = encoded + left;
          break;
        case 2:
          value = encoded + above;
          break;
        case 3:
          value = encoded + Math.floor((left + above) / 2);
          break;
        case 4:
          value = encoded + paeth(left, above, upperLeft);
          break;
        default:
          throw new Error(`Unsupported PNG filter ${filter}`);
      }
      decoded[outputIndex] = value & 0xff;
    }
  }
  if (colorType === 6) {
    return { width, height, data: decoded };
  }
  const pixels = new Uint8Array(width * height * 4);
  for (let source = 0, target = 0; source < decoded.length; source += 3) {
    pixels[target++] = decoded[source];
    pixels[target++] = decoded[source + 1];
    pixels[target++] = decoded[source + 2];
    pixels[target++] = 255;
  }
  return { width, height, data: pixels };
};

export const encodePng = (
  image: RgbaImage,
  options: { colorType?: "rgb" | "rgba" } = {},
) => {
  if (
    !Number.isInteger(image.width) ||
    !Number.isInteger(image.height) ||
    image.width <= 0 ||
    image.height <= 0 ||
    image.data.length !== image.width * image.height * 4
  ) {
    throw new Error("Invalid RGBA image dimensions");
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(image.width, 0);
  ihdr.writeUInt32BE(image.height, 4);
  ihdr[8] = 8;
  const channels = options.colorType === "rgb" ? 3 : 4;
  ihdr[9] = channels === 3 ? 2 : 6;
  const stride = image.width * channels;
  const raw = Buffer.alloc(image.height * (stride + 1));
  for (let y = 0; y < image.height; y++) {
    raw[y * (stride + 1)] = 0;
    const rowOffset = y * (stride + 1) + 1;
    if (channels === 4) {
      Buffer.from(
        image.data.subarray(y * image.width * 4, (y + 1) * image.width * 4),
      ).copy(raw, rowOffset);
    } else {
      for (let x = 0; x < image.width; x++) {
        const source = (y * image.width + x) * 4;
        const target = rowOffset + x * 3;
        raw[target] = image.data[source];
        raw[target + 1] = image.data[source + 1];
        raw[target + 2] = image.data[source + 2];
      }
    }
  }
  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

export const cropPng = (
  input: Uint8Array,
  crop: { x: number; y: number; width: number; height: number },
  scale = 1,
) => {
  const source = decodePng(input);
  const x = Math.round(crop.x * scale);
  const y = Math.round(crop.y * scale);
  const width = Math.round(crop.width * scale);
  const height = Math.round(crop.height * scale);
  if (
    x < 0 ||
    y < 0 ||
    width <= 0 ||
    height <= 0 ||
    x + width > source.width ||
    y + height > source.height
  ) {
    throw new Error("Semantic crop is outside screenshot bounds");
  }
  const data = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) {
    const sourceStart = ((y + row) * source.width + x) * 4;
    data.set(
      source.data.subarray(sourceStart, sourceStart + width * 4),
      row * width * 4,
    );
  }
  return encodePng({ width, height, data });
};

export const pngHash = (input: Uint8Array) =>
  createHash("sha256").update(input).digest("hex");
