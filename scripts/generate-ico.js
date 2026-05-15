/**
 * Generates build/icon.ico from build/icon.png using sharp.
 * Produces a BMP-based ICO (NSIS-compatible) with 7 sizes.
 * Usage: node scripts/generate-ico.js
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT  = path.join(__dirname, '..', 'build', 'icon.png');
const OUTPUT = path.join(__dirname, '..', 'build', 'icon.ico');
const SIZES  = [16, 24, 32, 48, 64, 128, 256];

async function buildDIBEntry(size) {
    const raw = await sharp(INPUT)
        .resize(size, size, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .raw()
        .toBuffer();

    // raw is top-to-bottom RGB; ICO needs bottom-to-top BGRA
    const pixelCount = size * size;
    const bgra = Buffer.alloc(pixelCount * 4);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const src = ((size - 1 - y) * size + x) * 3; // flip vertically
            const dst = (y * size + x) * 4;
            bgra[dst]     = raw[src + 2]; // B
            bgra[dst + 1] = raw[src + 1]; // G
            bgra[dst + 2] = raw[src];     // R
            bgra[dst + 3] = 255;          // A
        }
    }

    // BITMAPINFOHEADER (40 bytes) — biHeight is doubled per ICO spec
    const bih = Buffer.alloc(40);
    bih.writeUInt32LE(40,              0);
    bih.writeInt32LE(size,             4);
    bih.writeInt32LE(size * 2,         8);  // height × 2
    bih.writeUInt16LE(1,              12);  // planes
    bih.writeUInt16LE(32,             14);  // biBitCount
    bih.writeUInt32LE(0,              16);  // BI_RGB
    bih.writeUInt32LE(pixelCount * 4, 20);  // biSizeImage

    // AND mask: 1 bit per pixel, row-padded to 4 bytes — all 0 (fully opaque)
    const maskRowBytes = Math.ceil(size / 32) * 4;
    const andMask = Buffer.alloc(maskRowBytes * size, 0);

    return Buffer.concat([bih, bgra, andMask]);
}

async function main() {
    console.log(`Generating ICO from ${INPUT}`);
    const entries = await Promise.all(SIZES.map(buildDIBEntry));

    const icoHeaderSize = 6;
    const dirEntrySize  = 16;
    const dataOffset    = icoHeaderSize + SIZES.length * dirEntrySize;
    const totalSize     = dataOffset + entries.reduce((s, e) => s + e.length, 0);
    const buf           = Buffer.alloc(totalSize);

    // ICO header
    buf.writeUInt16LE(0,            0);
    buf.writeUInt16LE(1,            2); // type = icon
    buf.writeUInt16LE(SIZES.length, 4);

    let dirOff  = icoHeaderSize;
    let dataOff = dataOffset;

    for (let i = 0; i < SIZES.length; i++) {
        const sz  = SIZES[i];
        const ent = entries[i];
        buf.writeUInt8(sz >= 256 ? 0 : sz, dirOff);      // width  (0 = 256)
        buf.writeUInt8(sz >= 256 ? 0 : sz, dirOff + 1);  // height
        buf.writeUInt8(0,                  dirOff + 2);  // colorCount
        buf.writeUInt8(0,                  dirOff + 3);  // reserved
        buf.writeUInt16LE(1,               dirOff + 4);  // planes
        buf.writeUInt16LE(32,              dirOff + 6);  // bitCount
        buf.writeUInt32LE(ent.length,      dirOff + 8);  // sizeInBytes
        buf.writeUInt32LE(dataOff,         dirOff + 12); // offsetInBytes
        ent.copy(buf, dataOff);
        dataOff += ent.length;
        dirOff  += dirEntrySize;
    }

    fs.writeFileSync(OUTPUT, buf);
    console.log(`✅  ${OUTPUT}  (${(totalSize / 1024).toFixed(1)} KB, ${SIZES.length} sizes)`);
}

main().catch(e => { console.error(e); process.exit(1); });
