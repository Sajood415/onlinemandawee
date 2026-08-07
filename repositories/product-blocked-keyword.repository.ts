import { prisma } from "@/lib/db/prisma";

export class ProductBlockedKeywordRepository {
  listAll() {
    return prisma.productBlockedKeyword.findMany({
      orderBy: { word: "asc" },
    });
  }

  count() {
    return prisma.productBlockedKeyword.count();
  }

  findById(id: string) {
    return prisma.productBlockedKeyword.findUnique({ where: { id } });
  }

  findByNormalizedWord(normalizedWord: string) {
    return prisma.productBlockedKeyword.findUnique({
      where: { normalizedWord },
    });
  }

  create(input: { word: string; normalizedWord: string }) {
    return prisma.productBlockedKeyword.create({
      data: {
        word: input.word,
        normalizedWord: input.normalizedWord,
      },
    });
  }

  createMany(words: Array<{ word: string; normalizedWord: string }>) {
    return prisma.productBlockedKeyword.createMany({
      data: words,
    });
  }

  deleteById(id: string) {
    return prisma.productBlockedKeyword.delete({ where: { id } });
  }
}
