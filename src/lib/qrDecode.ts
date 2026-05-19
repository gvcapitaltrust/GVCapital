/**
 * Server-side QR decoder. Used by the admin wallet-address endpoints to
 * verify that an uploaded QR PNG actually encodes the typed receive address
 * — a typo or paste mismatch here would cause client funds to be lost
 * forever, so we never trust the typed value alone.
 *
 * Stack: jimp (PNG → RGBA bitmap) + jsqr (decode QR from RGBA).
 */

import Jimp from "jimp";
import jsQR from "jsqr";

export interface QrDecodeResult {
    ok: true;
    text: string;
}

export interface QrDecodeFailure {
    ok: false;
    error: string;
}

export async function decodeQrFromBytes(
    bytes: Uint8Array | Buffer
): Promise<QrDecodeResult | QrDecodeFailure> {
    let image: Jimp;
    try {
        image = await Jimp.read(Buffer.from(bytes));
    } catch (err: any) {
        return { ok: false, error: `Could not read image: ${err?.message || "unknown"}` };
    }

    const { width, height, data } = image.bitmap;
    if (!width || !height) {
        return { ok: false, error: "Image has zero dimensions." };
    }

    // jimp's bitmap.data is a Node Buffer in RGBA order, which is byte-compatible
    // with Uint8ClampedArray, the format jsqr expects.
    const pixels = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);

    const decoded = jsQR(pixels, width, height);
    if (!decoded || !decoded.data) {
        return {
            ok: false,
            error: "No QR code detected in the image. Use a clear, high-contrast PNG.",
        };
    }

    return { ok: true, text: decoded.data };
}
