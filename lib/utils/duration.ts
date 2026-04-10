const durationPattern = /^(\d+)([mhd])$/;

export const durationToMilliseconds = (value: string) => {
  const match = durationPattern.exec(value);

  if (!match) {
    throw new Error(`Unsupported duration value: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2];

  if (unit === "m") {
    return amount * 60 * 1000;
  }

  if (unit === "h") {
    return amount * 60 * 60 * 1000;
  }

  return amount * 24 * 60 * 60 * 1000;
};

export const durationFromNow = (value: string) => {
  return new Date(Date.now() + durationToMilliseconds(value));
};
