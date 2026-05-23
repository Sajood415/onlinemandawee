import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { MembershipInvoiceRepository } from "@/repositories/membership-invoice.repository";
import { OrderRepository } from "@/repositories/order.repository";
import { ProductRepository } from "@/repositories/product.repository";
import { VendorLedgerEntryRepository } from "@/repositories/vendor-ledger-entry.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";

export class VendorDashboardService {
  constructor(
    private readonly vendorProfileRepository = new VendorProfileRepository(),
    private readonly orderRepository = new OrderRepository(),
    private readonly productRepository = new ProductRepository(),
    private readonly vendorLedgerEntryRepository = new VendorLedgerEntryRepository(),
    private readonly membershipInvoiceRepository = new MembershipInvoiceRepository()
  ) {}

  async getSummary(auth: AuthenticatedUser) {
    const vendor = await this.vendorProfileRepository.findByUserId(auth.id);

    if (!vendor) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor profile not found",
        statusCode: 404,
      });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [vendorOrders, products, ledgerEntries, membershipInvoices] = await Promise.all([
      this.orderRepository.listByVendorProfileId(vendor.id),
      this.productRepository.listByVendor(vendor.id),
      this.vendorLedgerEntryRepository.listByVendorProfileId(vendor.id),
      this.membershipInvoiceRepository.listByVendorProfileId(vendor.id),
    ]);

    const totalOrders = vendorOrders.length;

    const recentOrders = vendorOrders.filter(
      (o) => new Date(o.createdAt) >= thirtyDaysAgo
    );
    const recentSalesAmount = recentOrders.reduce(
      (sum, o) => sum + o.grandTotalAmount,
      0
    );
    const recentSalesCurrency = vendorOrders[0]?.currency ?? "USD";

    const netEarnings = ledgerEntries
      .filter((e) => e.bucket === "AVAILABLE")
      .reduce((sum, e) => sum + e.amount, 0);
    const earningsCurrency = ledgerEntries[0]?.currency ?? "USD";

    const latestInvoice = membershipInvoices[0] ?? null;
    const subscriptionStatus = latestInvoice
      ? (latestInvoice as { status: string }).status
      : "NO_INVOICE";

    const pendingApprovals = products.filter(
      (p) => p.approvalStatus === "PENDING_APPROVAL"
    ).length;

    const totalProducts = products.length;
    const activeProducts = products.filter(
      (p) => p.approvalStatus === "APPROVED"
    ).length;

    return {
      storeName: vendor.storeName ?? null,
      storeSlug: vendor.storeSlug ?? null,
      vendorStatus: vendor.status,
      totalOrders,
      recentSales: {
        amount: recentSalesAmount,
        currency: recentSalesCurrency,
        periodDays: 30,
        orderCount: recentOrders.length,
      },
      netEarnings: {
        amount: netEarnings,
        currency: earningsCurrency,
      },
      subscription: {
        status: subscriptionStatus,
        latestInvoiceDueAt: latestInvoice
          ? (latestInvoice as { dueAt: Date }).dueAt?.toISOString() ?? null
          : null,
        latestInvoicePeriodStart: latestInvoice
          ? (latestInvoice as { periodStart: Date }).periodStart?.toISOString() ?? null
          : null,
      },
      products: {
        total: totalProducts,
        active: activeProducts,
        pendingApprovals,
      },
    };
  }
}
