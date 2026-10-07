import { createReadStream, createWriteStream } from 'fs';
import { readFile } from 'fs/promises';
import { pipeline } from 'stream/promises';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function u16(n: number) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n >>> 0, 0);
  return b;
}
function u32(n: number) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}

export type ZipEntry = { name: string; data?: Buffer; filePath?: string };

export async function writeZipFile(targetPath: string, entries: ZipEntry[]) {
  const out = createWriteStream(targetPath);
  const centrals: Buffer[] = [];
  let offset = 0;
  const { dosTime, dosDate } = dosDateTime();

  const write = async (buf: Buffer) => {
    if (!out.write(buf)) await new Promise((r) => out.once('drain', r));
    offset += buf.length;
  };

  for (const entry of entries) {
    const name = Buffer.from(entry.name.replace(/\\/g, '/'), 'utf8');
    const data = entry.data || (entry.filePath ? await readFile(entry.filePath) : Buffer.alloc(0));
    const crc = crc32(data);
    const localOffset = offset;
    await write(Buffer.concat([Buffer.from('PK\u0003\u0004'), u16(20), u16(0), u16(0), u16(dosTime), u16(dosDate), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name, data]));
    centrals.push(
      Buffer.concat([
        Buffer.from('PK\u0001\u0002'),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(dosTime),
        u16(dosDate),
        u32(crc),
        u32(data.length),
        u32(data.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(localOffset),
        name,
      ])
    );
  }

  const centralStart = offset;
  for (const c of centrals) await write(c);
  const centralSize = offset - centralStart;
  await write(
    Buffer.concat([Buffer.from('PK\u0005\u0006'), u16(0), u16(0), u16(centrals.length), u16(centrals.length), u32(centralSize), u32(centralStart), u16(0)])
  );
  await new Promise<void>((resolve, reject) => {
    out.end(() => resolve());
    out.on('error', reject);
  });
}

export async function streamFileTo(target: NodeJS.WritableStream, filePath: string) {
  await pipeline(createReadStream(filePath), target);
}
