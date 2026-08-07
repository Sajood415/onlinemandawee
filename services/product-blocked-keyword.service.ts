import "server-only";

import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import type { ProductTranslations } from "@/lib/localization/product-content";
import {
  DEFAULT_PRODUCT_BLOCKED_KEYWORDS,
  buildProductScanText,
  findMatchedBlockedKeywords,
  normalizeBlockedKeyword,
} from "@/lib/products/blocked-keywords";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { ProductBlockedKeywordRepository } from "@/repositories/product-blocked-keyword.repository";

export class ProductBlockedKeywordService {
  constructor(
    private readonly repository = new ProductBlockedKeywordRepository(),
    private readonly auditLogRepository = new AuditLogRepository()
  ) {}

  async list() {
    await this.ensureDefaults();
    const rows = await this.repository.listAll();
    return rows.map((row) => ({
      id: row.id,
      word: row.word,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async create(auth: AuthenticatedUser, word: string) {
    await this.ensureDefaults();
    const trimmed = word.trim();
    const normalizedWord = normalizeBlockedKeyword(trimmed);

    if (normalizedWord.length < 2) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Keyword must be at least 2 characters",
        statusCode: 400,
      });
    }

    const existing = await this.repository.findByNormalizedWord(normalizedWord);
    if (existing) {
      throw new AppError({
        code: ERROR_CODE.CONFLICT,
        message: "That keyword already exists",
        statusCode: 409,
      });
    }

    const created = await this.repository.create({
      word: trimmed,
      normalizedWord,
    });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "admin.product_blocked_keyword_created",
      entityType: "ProductBlockedKeyword",
      entityId: created.id,
    });

    return {
      id: created.id,
      word: created.word,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  async delete(auth: AuthenticatedUser, id: string) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Keyword not found",
        statusCode: 404,
      });
    }

    await this.repository.deleteById(id);

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "admin.product_blocked_keyword_deleted",
      entityType: "ProductBlockedKeyword",
      entityId: id,
    });

    return { deleted: true };
  }

  async findMatches(input: {
    name: string;
    description: string;
    translations?: ProductTranslations | null;
  }) {
    await this.ensureDefaults();
    const keywords = await this.repository.listAll();
    const scanText = buildProductScanText(input);
    return findMatchedBlockedKeywords(scanText, keywords);
  }

  private async ensureDefaults() {
    const count = await this.repository.count();
    if (count > 0) return;

    for (const word of DEFAULT_PRODUCT_BLOCKED_KEYWORDS) {
      const normalizedWord = normalizeBlockedKeyword(word);
      const existing = await this.repository.findByNormalizedWord(normalizedWord);
      if (existing) continue;
      await this.repository.create({ word, normalizedWord });
    }
  }
}
