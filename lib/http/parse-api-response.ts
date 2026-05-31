import { formatFlattenedValidationError } from "@/lib/http/format-validation-error-message";

export async function parseApiResponse<T>(res: Response): Promise<T> {
  const raw = await res.text();
  let json: { data: T } | { error?: { message?: string; details?: unknown } };

  try {
    json = JSON.parse(raw) as typeof json;
  } catch {
    throw new Error(
      res.ok
        ? "Invalid response from server"
        : "Server error. Please refresh the page and try again."
    );
  }

  if (!res.ok) {
    const baseMessage =
      json && "error" in json && json.error?.message
        ? json.error.message
        : "Something went wrong";
    const fromFields =
      json && "error" in json ? formatFlattenedValidationError(json.error?.details) : null;
    const message = fromFields ?? baseMessage;
    throw new Error(message);
  }

  if (!("data" in json)) {
    throw new Error("Invalid response");
  }

  return json.data;
}
