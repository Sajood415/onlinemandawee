import type { ProductTranslations } from "@/lib/localization/product-content";
import { parseProductTranslations } from "@/lib/localization/product-content";

export type ProductTranslationFormFields = {
  namePs: string;
  nameFa: string;
  descriptionPs: string;
  descriptionFa: string;
};

export const emptyProductTranslationFields = (): ProductTranslationFormFields => ({
  namePs: "",
  nameFa: "",
  descriptionPs: "",
  descriptionFa: "",
});

export function buildTranslationsPayload(
  fields: ProductTranslationFormFields
): ProductTranslations | undefined {
  const translations: ProductTranslations = {};

  if (fields.namePs.trim() || fields.descriptionPs.trim()) {
    translations.ps = {
      ...(fields.namePs.trim() ? { name: fields.namePs.trim() } : {}),
      ...(fields.descriptionPs.trim() ? { description: fields.descriptionPs.trim() } : {}),
    };
  }

  if (fields.nameFa.trim() || fields.descriptionFa.trim()) {
    translations["fa-AF"] = {
      ...(fields.nameFa.trim() ? { name: fields.nameFa.trim() } : {}),
      ...(fields.descriptionFa.trim() ? { description: fields.descriptionFa.trim() } : {}),
    };
  }

  return Object.keys(translations).length > 0 ? translations : undefined;
}

export function translationFieldsFromProduct(translations?: ProductTranslations | null | unknown) {
  const parsed = parseProductTranslations(translations);
  return {
    namePs: parsed?.ps?.name ?? "",
    nameFa: parsed?.["fa-AF"]?.name ?? "",
    descriptionPs: parsed?.ps?.description ?? "",
    descriptionFa: parsed?.["fa-AF"]?.description ?? "",
  } satisfies ProductTranslationFormFields;
}
