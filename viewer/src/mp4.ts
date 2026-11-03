/** Parse MP4 duration with bounded reads rather than buffering the movie. */
export async function durationFromMP4(
  size: number,
  read: (offset: number, length: number) => Promise<DataView>,
): Promise<number | null> {
  async function boxes(
    start: number,
    end: number,
    find: string,
  ): Promise<{ offset: number; header: number; size: number } | null> {
    let offset = start;
    for (let count = 0; count < 64 && offset + 8 <= end; count++) {
      const view = await read(offset, 16);
      const type = String.fromCharCode(...new Uint8Array(view.buffer, 4, 4));
      let length = view.getUint32(0),
        header = 8;
      if (length === 1) {
        if (view.byteLength < 16) return null;
        length = Number(view.getBigUint64(8));
        header = 16;
      }
      if (length === 0) length = end - offset;
      if (
        !Number.isSafeInteger(length) ||
        length < header ||
        offset + length > end
      )
        return null;
      if (type === find) return { offset, header, size: length };
      offset += length;
    }
    return null;
  }
  const moov = await boxes(0, size, "moov");
  if (!moov) return null;
  const mvhd = await boxes(
    moov.offset + moov.header,
    moov.offset + moov.size,
    "mvhd",
  );
  if (!mvhd) return null;
  const payloadSize = mvhd.size - mvhd.header;
  if (payloadSize < 20) return null;
  const data = await read(mvhd.offset + mvhd.header, Math.min(32, payloadSize));
  const version = data.getUint8(0);
  if (version !== 0 && version !== 1) return null;
  if (data.byteLength < (version === 1 ? 32 : 20)) return null;
  const timescale = data.getUint32(version === 1 ? 20 : 12);
  const duration =
    version === 1 ? Number(data.getBigUint64(24)) : data.getUint32(16);
  const seconds = duration / timescale;
  return timescale > 0 && Number.isFinite(seconds) && seconds > 0
    ? seconds
    : null;
}

export async function mp4Duration(
  bucket: R2Bucket,
  key: string,
  size: number,
): Promise<number | null> {
  return durationFromMP4(size, async (offset, length) => {
    const object = await bucket.get(key, {
      range: { offset, length: Math.min(length, size - offset) },
    });
    if (!object) throw new Error("Video no longer exists");
    return new DataView(await object.arrayBuffer());
  });
}
