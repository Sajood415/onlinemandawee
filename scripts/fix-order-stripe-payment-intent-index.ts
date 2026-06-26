import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function unsetNullStripePaymentIntentIds() {
  const result = await prisma.$runCommandRaw({
    update: "Order",
    updates: [
      {
        q: { stripePaymentIntentId: null },
        u: { $unset: { stripePaymentIntentId: "" } },
        multi: true,
      },
    ],
  });

  const modified =
    typeof result === "object" &&
    result !== null &&
    "nModified" in result &&
    typeof result.nModified === "number"
      ? result.nModified
      : "unknown";

  console.log(`Unset stripePaymentIntentId on ${modified} order(s) that had null.`);
}

async function unsetDuplicatePaymentIntentLinks() {
  const orders = await prisma.order.findMany({
    where: { stripePaymentIntentId: { not: null } },
    select: {
      id: true,
      orderNumber: true,
      stripePaymentIntentId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const seen = new Map<string, string>();
  const duplicateOrderNumbers: string[] = [];

  for (const order of orders) {
    const paymentIntentId = order.stripePaymentIntentId;
    if (!paymentIntentId) continue;

    if (seen.has(paymentIntentId)) {
      duplicateOrderNumbers.push(order.orderNumber);
      await prisma.$runCommandRaw({
        update: "Order",
        updates: [
          {
            q: { _id: { $oid: order.id } },
            u: { $unset: { stripePaymentIntentId: "" } },
          },
        ],
      });
      console.log(
        `Removed duplicate payment-intent link from ${order.orderNumber} (kept ${seen.get(paymentIntentId)}).`
      );
      continue;
    }

    seen.set(paymentIntentId, order.orderNumber);
  }

  if (duplicateOrderNumbers.length === 0) {
    console.log("No duplicate stripePaymentIntentId links found.");
  }
}

async function ensureSparsePaymentIntentIndex() {
  const indexes = await prisma.$runCommandRaw({
    listIndexes: "Order",
  });

  const firstBatch =
    typeof indexes === "object" &&
    indexes !== null &&
    "cursor" in indexes &&
    typeof indexes.cursor === "object" &&
    indexes.cursor !== null &&
    "firstBatch" in indexes.cursor &&
    Array.isArray(indexes.cursor.firstBatch)
      ? indexes.cursor.firstBatch
      : [];

  const existing = firstBatch.find(
    (index) =>
      typeof index === "object" &&
      index !== null &&
      "name" in index &&
      index.name === "Order_stripePaymentIntentId_key"
  );

  if (existing) {
    console.log("Sparse unique index Order_stripePaymentIntentId_key already exists.");
    return;
  }

  await prisma.$runCommandRaw({
    createIndexes: "Order",
    indexes: [
      {
        key: { stripePaymentIntentId: 1 },
        name: "Order_stripePaymentIntentId_key",
        unique: true,
        sparse: true,
      },
    ],
  });

  console.log("Created sparse unique index Order_stripePaymentIntentId_key.");
}

async function main() {
  await unsetDuplicatePaymentIntentLinks();
  await unsetNullStripePaymentIntentIds();
  await ensureSparsePaymentIntentIndex();
  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
