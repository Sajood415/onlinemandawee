import { formatFlattenedValidationError } from "@/lib/http/format-validation-error-message";

export async function parseApiResponse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as
    | { data: T }
    | { error?: { message?: string; details?: unknown } };

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
