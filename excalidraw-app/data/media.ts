/**
 * Media (audio/video) upload helper.
 *
 * Contract with the backend (intentionally minimal — the backend is free to
 * store the file on local disk, S3/OSS/COS, etc.):
 *
 *   POST {VITE_APP_UPLOAD_BACKEND}/upload   (multipart/form-data, field: "file")
 *   → 200 { url: string }   // a persistent, publicly-accessible URL
 *   → 4xx { error: string }
 *
 * The element only ever stores the returned `url`. When no backend is
 * configured we fall back to a local object URL so the UI can be exercised in
 * dev — note this URL does NOT survive reload or work across collaborators.
 */

export type MediaKind = "audio" | "video";

export class MediaUploadError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = "MediaUploadError";
  }
}

/** Max bytes we allow the client to attempt to upload. Tune as needed. */
export const MEDIA_UPLOAD_MAX_BYTES = 200 * 1024 * 1024; // 200 MiB

export const SUPPORTED_AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/aac",
  "audio/x-m4a",
  "audio/mp4",
] as const;

export const SUPPORTED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
] as const;

export const getMediaKindFromMimeType = (
  mimeType: string,
): MediaKind | null => {
  if (mimeType.startsWith("audio/")) {
    return "audio";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  return null;
};

export const isSupportedMediaFile = (file: File): boolean => {
  return getMediaKindFromMimeType(file.type) !== null;
};

const getUploadBackend = (): string | null => {
  const backend = import.meta.env.VITE_APP_UPLOAD_BACKEND;
  return backend && backend.trim() ? backend.replace(/\/$/, "") : null;
};

/**
 * Upload a media file and resolve to its persistent URL.
 *
 * @throws {MediaUploadError} when the file is too big, the format is
 * unsupported, or the backend rejects/ fails the upload.
 */
export const uploadMediaFile = async (
  file: File,
  opts: { signal?: AbortSignal } = {},
): Promise<{ url: string; kind: MediaKind }> => {
  const kind = getMediaKindFromMimeType(file.type);
  if (!kind) {
    throw new MediaUploadError(
      `Unsupported media type: ${file.type || "unknown"}`,
      "ERR_UNSUPPORTED_MEDIA_TYPE",
    );
  }

  if (file.size > MEDIA_UPLOAD_MAX_BYTES) {
    throw new MediaUploadError(
      `File too big (${Math.round(file.size / 1024 / 1024)} MiB)`,
      "ERR_FILE_TOO_BIG",
    );
  }

  const backend = getUploadBackend();

  // Dev fallback: no backend configured → local object URL.
  if (!backend) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(
        "[media] VITE_APP_UPLOAD_BACKEND is not set — using a local object URL. " +
          "This URL will not survive reload and won't work for collaborators.",
      );
    }
    return { url: URL.createObjectURL(file), kind };
  }

  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${backend}/upload`, {
      method: "POST",
      body: formData,
      signal: opts.signal,
    });
  } catch (error: any) {
    throw new MediaUploadError(
      error?.message || "Network error during upload",
      "ERR_NETWORK",
    );
  }

  if (!response.ok) {
    let message = `Upload failed (${response.status})`;
    try {
      const json = await response.json();
      if (json?.error) {
        message = json.error;
      }
    } catch {
      // ignore — keep the status-based message
    }
    throw new MediaUploadError(message, `ERR_HTTP_${response.status}`);
  }

  const json = await response.json();
  if (!json || typeof json.url !== "string") {
    throw new MediaUploadError(
      "Backend did not return a { url } payload",
      "ERR_BAD_RESPONSE",
    );
  }

  return { url: json.url, kind };
};
