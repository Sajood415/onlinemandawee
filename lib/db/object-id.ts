const MONGO_OBJECT_ID_REGEX = /^[a-f0-9]{24}$/i;

export function isMongoObjectId(value: string) {
  return MONGO_OBJECT_ID_REGEX.test(value);
}
