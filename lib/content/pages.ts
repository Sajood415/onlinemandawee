import { SITE_CONTACT } from "@/lib/content/contact-info";
import type { ContentPageDefinition } from "@/lib/content/types";

const { email, phoneDisplay } = SITE_CONTACT;

export const privacyPage: ContentPageDefinition = {
  slug: "privacy",
  title: "Privacy Policy",
  subtitle:
    "How Online Mandawee collects, uses, and protects your information when you shop on our multi-vendor marketplace.",
  badge: "Policies",
  showTableOfContents: true,
  showContactBlock: true,
  showLanguageNotice: true,
  relatedLinks: [
    { href: "/terms", label: "Terms of Service" },
    { href: "/refunds", label: "Refund Policy" },
    { href: "/contact", label: "Contact Us" },
  ],
  sections: [
    {
      id: "introduction",
      title: "Introduction",
      paragraphs: [
        `Online Mandawee ("we", "us", or "our") operates a multi-vendor marketplace that connects customers with independent vendors in Afghanistan and abroad. This Privacy Policy explains what personal information we collect, how we use it, and the choices you have.`,
        "By using our website, creating an account, checking out as a guest, or selling on our platform, you agree to the practices described in this policy.",
      ],
    },
    {
      id: "information-we-collect",
      title: "Information we collect",
      subsections: [
        {
          title: "Account and profile information",
          bullets: [
            "Name, email address, and phone number when you register or update your account.",
            "Saved delivery addresses and account preferences.",
            "Vendor business details, store information, and verification documents for sellers.",
          ],
        },
        {
          title: "Order and checkout information",
          bullets: [
            "Products ordered, quantities, delivery method, and shipping address.",
            "Guest checkout email and contact details when you purchase without an account.",
            "Order history, payment status, and delivery updates.",
          ],
        },
        {
          title: "Payment information",
          paragraphs: [
            "Payments are processed securely by Stripe. We do not store full card numbers on our servers. Stripe may collect billing details and fraud-prevention signals in accordance with its own privacy policy.",
          ],
        },
        {
          title: "Communications and support",
          bullets: [
            "Messages sent through order-related communications or dispute/refund cases.",
            "Evidence uploads submitted during refund or dispute resolution.",
            "Emails and support requests sent to our team.",
          ],
        },
        {
          title: "Technical and usage data",
          bullets: [
            "Device type, browser, IP address, and general usage logs.",
            "Cookies and similar technologies used to keep you signed in and improve the shopping experience.",
            "Currency and locale preferences.",
          ],
        },
      ],
    },
    {
      id: "how-we-use-information",
      title: "How we use your information",
      bullets: [
        "Process orders, payments, deliveries, and refunds or disputes.",
        "Connect customers with the correct vendor for each item in a multi-vendor order.",
        "Send transactional emails such as order confirmations, shipping updates, and account notifications.",
        "Provide customer and vendor support.",
        "Prevent fraud, enforce our terms, and maintain platform security.",
        "Improve our marketplace, analytics, and product experience.",
        "Comply with legal obligations and respond to lawful requests.",
      ],
    },
    {
      id: "sharing",
      title: "How we share information",
      paragraphs: [
        "We share information only as needed to operate the marketplace:",
        "We do not sell your personal information to third parties for their independent marketing purposes.",
      ],
      bullets: [
        "Vendors receive the information required to fulfill your order (such as items purchased, delivery address, and contact details).",
        "Payment processors (including Stripe) receive payment and billing data to process transactions.",
        "Service providers that help us host, email, analyze, or secure the platform.",
        "Authorities or third parties when required by law or to protect rights, safety, and platform integrity.",
      ],
    },
    {
      id: "guest-checkout",
      title: "Guest checkout",
      paragraphs: [
        "You may place orders without creating an account. We store your guest email and order details so we can fulfill the order and send updates.",
        "If you later create an account using the same email address, prior guest orders may be linked to your account automatically.",
      ],
    },
    {
      id: "retention",
      title: "Data retention",
      paragraphs: [
        "We retain personal information for as long as needed to provide our services, resolve disputes, meet legal obligations, and enforce our agreements. Order and financial records may be kept for a longer period where required for accounting, tax, or compliance purposes.",
      ],
    },
    {
      id: "security",
      title: "Security",
      paragraphs: [
        "We use administrative, technical, and organizational measures designed to protect personal information. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.",
      ],
    },
    {
      id: "your-rights",
      title: "Your choices and rights",
      bullets: [
        "Update account information from your account settings.",
        "Request access to or correction of personal information by contacting us.",
        "Opt out of non-essential marketing communications where applicable.",
        "Disable cookies through your browser settings, though some features may not work properly.",
      ],
    },
    {
      id: "children",
      title: "Children's privacy",
      paragraphs: [
        "Our marketplace is not directed to children under 13, and we do not knowingly collect personal information from children. If you believe a child has provided us information, please contact us so we can take appropriate action.",
      ],
    },
    {
      id: "changes",
      title: "Changes to this policy",
      paragraphs: [
        "We may update this Privacy Policy from time to time. The \"Last updated\" date at the top of this page indicates when the policy was last revised. Continued use of the platform after changes become effective constitutes acceptance of the updated policy.",
      ],
    },
    {
      id: "contact",
      title: "Contact us",
      paragraphs: [
        `If you have questions about this Privacy Policy or our data practices, contact us at ${email} or ${phoneDisplay}.`,
      ],
    },
  ],
};

export const termsPage: ContentPageDefinition = {
  slug: "terms",
  title: "Terms of Service",
  subtitle:
    "The rules that govern your use of Online Mandawee as a customer on our multi-vendor marketplace.",
  badge: "Policies",
  showTableOfContents: true,
  showContactBlock: true,
  showLanguageNotice: true,
  relatedLinks: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/refunds", label: "Refund Policy" },
    { href: "/help", label: "Help Center" },
  ],
  sections: [
    {
      id: "agreement",
      title: "Agreement to terms",
      paragraphs: [
        "These Terms of Service (\"Terms\") govern your access to and use of Online Mandawee, including browsing, purchasing, and interacting with vendors on our platform.",
        "By using the site, placing an order, or creating an account, you agree to these Terms and our Privacy Policy. If you do not agree, please do not use the platform.",
      ],
    },
    {
      id: "marketplace-model",
      title: "Marketplace model",
      paragraphs: [
        "Online Mandawee is a marketplace platform. Product listings are offered by independent third-party vendors. When you purchase an item, you enter into a transaction for that item with the relevant vendor, while Online Mandawee facilitates checkout, payment processing, and platform services.",
        "We may update, suspend, or discontinue any part of the platform at any time.",
      ],
    },
    {
      id: "accounts",
      title: "Accounts and eligibility",
      bullets: [
        "You must provide accurate and complete information when creating an account.",
        "You are responsible for maintaining the confidentiality of your login credentials.",
        "You must be legally able to enter into binding contracts to use the platform.",
        "We may suspend or terminate accounts that violate these Terms or pose a risk to the platform.",
      ],
    },
    {
      id: "guest-checkout",
      title: "Guest checkout",
      paragraphs: [
        "You may checkout as a guest without creating an account. You are responsible for providing a valid email address and accurate delivery information.",
        "Guest orders are subject to the same product, pricing, delivery, and refund rules as account-based orders.",
      ],
    },
    {
      id: "orders-pricing",
      title: "Orders, pricing, and availability",
      bullets: [
        "Product descriptions, images, prices, and availability are provided by vendors and may change without notice.",
        "An order is confirmed once payment is successfully processed.",
        "Multi-vendor carts may result in separate fulfillment by each vendor.",
        "We may cancel or refuse orders affected by pricing errors, suspected fraud, or vendor unavailability.",
      ],
    },
    {
      id: "payments",
      title: "Payments",
      paragraphs: [
        "Payments are processed through Stripe. By placing an order, you authorize us and our payment partners to charge your selected payment method for the order total, including applicable product, delivery, and platform fees shown at checkout.",
        "You agree not to use unauthorized payment methods or engage in fraudulent activity.",
      ],
    },
    {
      id: "delivery",
      title: "Delivery and fulfillment",
      paragraphs: [
        "Vendors are responsible for preparing and fulfilling orders according to the delivery method selected at checkout. Delivery times are estimates and may vary based on location, vendor capacity, and external factors.",
        "Risk of loss for physical goods passes to you upon delivery to the address provided, subject to applicable local rules.",
      ],
    },
    {
      id: "refunds-disputes",
      title: "Refunds and disputes",
      paragraphs: [
        "Refund requests are handled through our dispute-based refund process. Customers may request a refund within 3 days after an order is marked delivered, subject to eligibility rules and review.",
        "See our Refund Policy for full details on timelines, vendor response, and platform review.",
      ],
    },
    {
      id: "prohibited-conduct",
      title: "Prohibited conduct",
      bullets: [
        "Using the platform for unlawful, fraudulent, or abusive purposes.",
        "Attempting to interfere with platform security or other users' accounts.",
        "Misrepresenting your identity or submitting false order or dispute information.",
        "Scraping, copying, or reverse engineering the platform except as permitted by law.",
      ],
    },
    {
      id: "intellectual-property",
      title: "Intellectual property",
      paragraphs: [
        "The Online Mandawee brand, website design, software, and platform content are owned by us or our licensors. Vendor product content remains the property of the respective vendors or rights holders.",
        "You may not use our trademarks or platform materials without prior written permission.",
      ],
    },
    {
      id: "disclaimers",
      title: "Disclaimers",
      paragraphs: [
        "The platform and products are provided on an \"as is\" and \"as available\" basis to the fullest extent permitted by law. We do not guarantee uninterrupted access, error-free operation, or that every product will meet your expectations.",
        "To the extent permitted by law, we disclaim warranties not expressly stated in these Terms.",
      ],
    },
    {
      id: "limitation",
      title: "Limitation of liability",
      paragraphs: [
        "To the fullest extent permitted by law, Online Mandawee and its affiliates are not liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the platform.",
        "Our total liability for any claim relating to the platform or an order is limited to the amount you paid for the relevant order, unless a higher limit is required by applicable law.",
      ],
    },
    {
      id: "governing-law",
      title: "Governing law",
      paragraphs: [
        "These Terms are governed by the laws applicable in Afghanistan, without regard to conflict-of-law principles. Disputes should first be raised with our support team so we can attempt to resolve them informally.",
      ],
    },
    {
      id: "changes",
      title: "Changes to these Terms",
      paragraphs: [
        "We may modify these Terms at any time. Material changes will be reflected by updating the \"Last updated\" date. Your continued use of the platform after changes take effect constitutes acceptance.",
      ],
    },
    {
      id: "contact",
      title: "Contact",
      paragraphs: [
        `Questions about these Terms may be sent to ${email} or ${phoneDisplay}.`,
      ],
    },
  ],
};

export const refundsPage: ContentPageDefinition = {
  slug: "refunds",
  title: "Refund Policy",
  subtitle:
    "How refund requests work on Online Mandawee, including eligibility, timelines, and the dispute review process.",
  badge: "Policies",
  showTableOfContents: true,
  showContactBlock: true,
  showLanguageNotice: true,
  relatedLinks: [
    { href: "/terms", label: "Terms of Service" },
    { href: "/help", label: "Help Center" },
    { href: "/contact", label: "Contact Us" },
  ],
  sections: [
    {
      id: "overview",
      title: "Overview",
      paragraphs: [
        "Online Mandawee is a multi-vendor marketplace. Refund requests are handled through a structured dispute process so customers, vendors, and our support team can review each case fairly.",
        "This policy describes when you may request a refund, how the process works, and what outcomes you can expect.",
      ],
    },
    {
      id: "eligibility",
      title: "Refund eligibility window",
      paragraphs: [
        "You may request a refund for an eligible order item within 3 days after the order (or vendor portion of the order) is marked as delivered.",
        "After this window closes, the refund request option is no longer available in your account for that item, except where required by law or at our discretion in exceptional circumstances.",
      ],
    },
    {
      id: "how-to-request",
      title: "How to request a refund",
      bullets: [
        "Sign in to your account and open the order from your account overview.",
        "Select the eligible item and submit a refund request with your reason and any supporting details.",
        "If you checked out as a guest, create an account using the same email address to access your order history and submit a request.",
        "You may upload supporting evidence such as photos when relevant.",
      ],
    },
    {
      id: "dispute-process",
      title: "Dispute-based review process",
      subsections: [
        {
          title: "Step 1 — Customer request",
          paragraphs: [
            "When you submit a request, a refund case is opened for the specific order item and vendor involved.",
          ],
        },
        {
          title: "Step 2 — Vendor response",
          paragraphs: [
            "The vendor is notified and may accept, partially accept, or decline the request. They may provide comments or evidence.",
          ],
        },
        {
          title: "Step 3 — Platform review",
          paragraphs: [
            "If the case is not resolved between you and the vendor, it may be escalated to Online Mandawee for admin review and a final decision.",
          ],
        },
        {
          title: "Step 4 — Resolution",
          paragraphs: [
            "Approved refunds are processed according to our internal financial workflows. Outcomes may include full approval, partial approval, or denial depending on the facts of the case.",
          ],
        },
      ],
    },
    {
      id: "multi-vendor",
      title: "Multi-vendor orders",
      paragraphs: [
        "If your checkout included items from more than one vendor, each vendor portion is fulfilled and reviewed separately. Refund eligibility and decisions apply per vendor order item, not necessarily to the entire checkout at once.",
      ],
    },
    {
      id: "non-refundable",
      title: "Situations that may not qualify",
      paragraphs: [
        "We and our vendors may consider exceptional circumstances on a case-by-case basis.",
      ],
      bullets: [
        "Requests submitted after the 3-day post-delivery window.",
        "Items that were delivered as described and show no defect, damage, or fulfillment issue.",
        "Change-of-mind requests where the product was correctly fulfilled.",
        "Cases involving suspected abuse, false claims, or policy violations.",
      ],
    },
    {
      id: "payment-method",
      title: "Refund method and timing",
      paragraphs: [
        "Approved refunds are handled through our platform payment and ledger processes. Timing may depend on your payment method, bank, and whether additional review is required.",
        "If a refund is approved, we will notify you by email. If you have questions about the status of a refund case, contact support with your order number.",
      ],
    },
    {
      id: "cancellations",
      title: "Order cancellations",
      paragraphs: [
        "Orders that have not yet been accepted or fulfilled by a vendor may be cancellable in limited circumstances. Once preparation or fulfillment has begun, cancellation may no longer be available and a refund request may be required instead.",
      ],
    },
    {
      id: "contact",
      title: "Need help with a refund?",
      paragraphs: [
        `Contact us at ${email} or ${phoneDisplay} with your order number and a brief description of the issue. For faster handling, submit the request through your account when eligible.`,
      ],
    },
  ],
};

export const vendorTermsPage: ContentPageDefinition = {
  slug: "vendor-terms",
  title: "Vendor Terms",
  subtitle:
    "Terms that apply to vendors selling on the Online Mandawee marketplace.",
  badge: "Vendor policies",
  showTableOfContents: true,
  showContactBlock: true,
  showLanguageNotice: true,
  relatedLinks: [
    { href: "/vendor/register", label: "Vendor Program" },
    { href: "/refunds", label: "Refund Policy" },
    { href: "/contact", label: "Contact Us" },
  ],
  sections: [
    {
      id: "introduction",
      title: "Introduction",
      paragraphs: [
        "These Vendor Terms apply to businesses and sellers approved to list products and fulfill orders on Online Mandawee. By registering as a vendor, submitting products, or accepting orders, you agree to these terms in addition to our general Terms of Service and Refund Policy where applicable.",
      ],
    },
    {
      id: "eligibility",
      title: "Vendor eligibility and onboarding",
      bullets: [
        "You must provide accurate business, contact, and store information during registration.",
        "We may request verification documents and approve or reject applications at our discretion.",
        "You must have the legal right to sell the products you list.",
        "We may suspend or terminate vendor accounts for policy violations, poor performance, or legal risk.",
      ],
    },
    {
      id: "listings",
      title: "Product listings",
      bullets: [
        "Listings must be accurate, lawful, and include clear pricing, descriptions, and images.",
        "You are responsible for inventory availability and updating listings promptly.",
        "Prohibited, counterfeit, unsafe, or misleading products are not allowed.",
        "We may remove or archive listings that violate platform standards.",
      ],
    },
    {
      id: "fulfillment",
      title: "Order fulfillment",
      bullets: [
        "You are responsible for preparing, packaging, and delivering orders assigned to your store.",
        "You must update order status accurately as items progress through fulfillment.",
        "Delivery times shown to customers should reflect realistic fulfillment capacity.",
        "You must comply with applicable product, labeling, and consumer protection requirements.",
      ],
    },
    {
      id: "payments-fees",
      title: "Payments and fees",
      paragraphs: [
        "Customer payments are processed through Stripe at checkout. Vendor payouts and platform fees are handled according to your vendor agreement, membership plan, and reporting dashboard.",
        "You are responsible for applicable taxes, record keeping, and compliance with local business regulations.",
      ],
    },
    {
      id: "refunds-disputes",
      title: "Refunds and disputes",
      paragraphs: [
        "Customers may request refunds within 3 days after an order is marked delivered, subject to platform eligibility rules.",
        "When a refund case is opened, you must review and respond in good faith within the platform workflow.",
        "If a case is escalated, Online Mandawee may make a final decision on disputed refunds. By selling on the platform, you agree that Online Mandawee has final decision authority on escalated disputes and refunds.",
      ],
    },
    {
      id: "conduct",
      title: "Vendor conduct",
      bullets: [
        "Treat customers professionally and respond to order and dispute communications promptly.",
        "Do not manipulate reviews, pricing, or platform systems.",
        "Do not use customer data for purposes outside order fulfillment and required support.",
        "Do not circumvent platform fees or direct customers off-platform for marketplace orders.",
      ],
    },
    {
      id: "intellectual-property",
      title: "Intellectual property",
      paragraphs: [
        "You represent that your listings, images, and content do not infringe third-party rights. You grant Online Mandawee a limited license to display your content on the platform for marketing and operational purposes.",
      ],
    },
    {
      id: "suspension",
      title: "Suspension and termination",
      paragraphs: [
        "We may suspend listings or vendor access for quality, legal, fraud, or policy reasons. You remain responsible for outstanding orders and open disputes during suspension where fulfillment is still required.",
      ],
    },
    {
      id: "liability",
      title: "Limitation of liability",
      paragraphs: [
        "To the extent permitted by law, Online Mandawee is not liable for lost profits, indirect damages, or vendor business interruption arising from platform use. Our role is to facilitate marketplace transactions subject to these terms.",
      ],
    },
    {
      id: "changes",
      title: "Changes",
      paragraphs: [
        "We may update these Vendor Terms from time to time. Continued use of vendor services after updates become effective constitutes acceptance.",
      ],
    },
    {
      id: "contact",
      title: "Vendor support",
      paragraphs: [
        `Vendor questions may be sent to ${email} or ${phoneDisplay}.`,
      ],
    },
  ],
};

export const aboutPage: ContentPageDefinition = {
  slug: "about",
  title: "About Online Mandawee",
  subtitle:
    "Afghanistan's trusted multi-vendor marketplace — connecting local vendors with customers at home and abroad.",
  badge: "Company",
  showTableOfContents: false,
  showContactBlock: true,
  showLanguageNotice: true,
  relatedLinks: [
    { href: "/how-it-works", label: "How It Works" },
    { href: "/vendor/register", label: "Become a Vendor" },
    { href: "/contact", label: "Contact Us" },
  ],
  sections: [
    {
      id: "mission",
      title: "Our mission",
      paragraphs: [
        "Online Mandawee makes it easy to discover quality products from trusted Afghan vendors and have them delivered to the people who matter most.",
        "Whether you are shopping for everyday essentials, gifts for family in Afghanistan, or specialty items from local businesses, our marketplace brings vendors and customers together on one secure platform.",
      ],
    },
    {
      id: "what-we-offer",
      title: "What we offer",
      bullets: [
        "A curated multi-vendor marketplace with groceries, gifts, and everyday products.",
        "Secure checkout with Stripe for customers at home and abroad.",
        "Guest checkout for quick purchases without creating an account.",
        "Vendor tools for listings, orders, promotions, and payouts.",
        "Structured refund and dispute support when something goes wrong.",
      ],
    },
    {
      id: "trust",
      title: "Built for trust",
      paragraphs: [
        "We review vendor applications, monitor order fulfillment, and provide customer support across the order lifecycle. Our policies are designed to protect buyers and sellers while keeping the marketplace fair and transparent.",
      ],
    },
    {
      id: "community",
      title: "Supporting local commerce",
      paragraphs: [
        "Every order on Online Mandawee supports independent vendors building businesses in Afghanistan. We are committed to reliable delivery, clear communication, and a shopping experience that feels modern, secure, and local.",
      ],
    },
  ],
};

export const howItWorksPage: ContentPageDefinition = {
  slug: "how-it-works",
  title: "How It Works",
  subtitle:
    "Shop from multiple vendors, pay securely once, and track fulfillment every step of the way.",
  badge: "Shopping guide",
  showTableOfContents: true,
  showContactBlock: true,
  showLanguageNotice: true,
  relatedLinks: [
    { href: "/products", label: "Browse Products" },
    { href: "/refunds", label: "Refund Policy" },
    { href: "/help", label: "Help Center" },
  ],
  sections: [
    {
      id: "browse",
      title: "1. Browse and add to cart",
      paragraphs: [
        "Explore products from verified vendors across categories such as groceries, gifts, and everyday essentials. Add items from one or more vendors to your cart.",
      ],
    },
    {
      id: "checkout",
      title: "2. Checkout securely",
      bullets: [
        "Review your cart, delivery address, and delivery options.",
        "Pay securely with Stripe.",
        "Checkout with an account or as a guest using your email address.",
      ],
    },
    {
      id: "fulfillment",
      title: "3. Vendors fulfill your order",
      paragraphs: [
        "Each vendor prepares and ships their portion of your order independently. You will receive email updates as your order progresses through fulfillment and delivery.",
      ],
    },
    {
      id: "delivery",
      title: "4. Delivery to your address",
      paragraphs: [
        "Delivery options and fees are calculated at checkout based on your location and the items in your cart. Vendors mark orders as delivered once completed.",
      ],
    },
    {
      id: "account",
      title: "5. Track and manage orders",
      bullets: [
        "Signed-in customers can view order status from their account.",
        "Guest customers can create an account with the same email to access order history.",
        "Need help? Visit our Help Center or contact support.",
      ],
    },
    {
      id: "refunds",
      title: "6. Refunds if needed",
      paragraphs: [
        "If something is wrong with your order, you may request a refund within 3 days after delivery through our dispute process. See the Refund Policy for details.",
      ],
    },
  ],
};

export const helpPage: ContentPageDefinition = {
  slug: "help",
  title: "Help Center",
  subtitle:
    "Answers to common questions about orders, payments, delivery, accounts, and refunds.",
  badge: "Support",
  showTableOfContents: true,
  showContactBlock: true,
  showLanguageNotice: true,
  relatedLinks: [
    { href: "/refunds", label: "Refund Policy" },
    { href: "/how-it-works", label: "How It Works" },
    { href: "/contact", label: "Contact Us" },
  ],
  sections: [
    {
      id: "orders",
      title: "Orders and checkout",
      subsections: [
        {
          title: "Can I checkout without an account?",
          paragraphs: [
            "Yes. Guest checkout is supported. Enter your email at checkout so we can send order confirmations and updates. Create an account later with the same email to view order history.",
          ],
        },
        {
          title: "Why is my cart split by vendor?",
          paragraphs: [
            "Online Mandawee is a multi-vendor marketplace. Each vendor fulfills their own items, so orders may be split by seller even when you pay once at checkout.",
          ],
        },
      ],
    },
    {
      id: "payments",
      title: "Payments",
      subsections: [
        {
          title: "What payment methods do you accept?",
          paragraphs: [
            "Payments are processed securely through Stripe. Available payment methods depend on your region and are shown at checkout.",
          ],
        },
        {
          title: "Was I charged successfully?",
          paragraphs: [
            "You will receive an order confirmation email after successful payment. You can also view payment status in your account for signed-in customers.",
          ],
        },
      ],
    },
    {
      id: "delivery",
      title: "Delivery",
      subsections: [
        {
          title: "How is delivery calculated?",
          paragraphs: [
            "Delivery fees and options are shown at checkout based on your address and the items in your cart. Each vendor fulfills their portion of the order.",
          ],
        },
        {
          title: "How do I know when my order is delivered?",
          paragraphs: [
            "You will receive email updates as vendors progress through fulfillment. Signed-in customers can also check status from their account overview.",
          ],
        },
      ],
    },
    {
      id: "accounts",
      title: "Accounts",
      subsections: [
        {
          title: "How do I access a guest order?",
          paragraphs: [
            "Create an account or sign in using the same email address you used at guest checkout. Your previous guest orders may be linked automatically.",
          ],
        },
        {
          title: "How do I update my details?",
          paragraphs: [
            "Signed-in customers can update profile and saved addresses from account settings.",
          ],
        },
      ],
    },
    {
      id: "refunds",
      title: "Refunds and disputes",
      subsections: [
        {
          title: "When can I request a refund?",
          paragraphs: [
            "You may request a refund within 3 days after an order is marked delivered, subject to eligibility rules. Submit the request from your account.",
          ],
        },
        {
          title: "What happens after I submit a refund request?",
          paragraphs: [
            "A refund case is opened for review. The vendor may respond first, and unresolved cases may be escalated to Online Mandawee for a final decision. See our Refund Policy for the full process.",
          ],
        },
      ],
    },
    {
      id: "vendors",
      title: "For vendors",
      subsections: [
        {
          title: "How do I sell on Online Mandawee?",
          paragraphs: [
            "Apply through the Vendor Program page. Once approved, you can list products, manage orders, and access vendor tools from your dashboard.",
          ],
        },
      ],
    },
  ],
};

export const contactPage: ContentPageDefinition = {
  slug: "contact",
  title: "Contact Us",
  subtitle:
    "Reach our support team for order help, vendor questions, or general inquiries about Online Mandawee.",
  badge: "Support",
  showTableOfContents: false,
  showContactBlock: false,
  showLanguageNotice: true,
  relatedLinks: [
    { href: "/help", label: "Help Center" },
    { href: "/refunds", label: "Refund Policy" },
    { href: "/vendor/register", label: "Vendor Program" },
  ],
  sections: [
    {
      id: "customer-support",
      title: "Customer support",
      paragraphs: [
        "For order status, delivery questions, refund requests, or account help, contact us with your order number if available.",
      ],
      bullets: [
        `Email: ${email}`,
        `Phone: ${phoneDisplay}`,
      ],
    },
    {
      id: "vendor-support",
      title: "Vendor support",
      paragraphs: [
        "Existing and prospective vendors can reach us for onboarding, account issues, payouts, and policy questions.",
      ],
      bullets: [
        `Email: ${email}`,
        `Phone: ${phoneDisplay}`,
      ],
    },
    {
      id: "response-times",
      title: "Response times",
      paragraphs: [
        "We aim to respond to emails within 1–2 business days. Phone support is available during business hours (Afghanistan time).",
        "For refund cases already open in your account, please continue the conversation in the dispute thread so all details stay in one place.",
      ],
    },
    {
      id: "before-you-write",
      title: "Before you contact us",
      bullets: [
        "Check the Help Center for answers to common questions.",
        "Review the Refund Policy if your question is about returns or disputes.",
        "Signed-in customers can view live order status from their account.",
      ],
    },
  ],
};

export const CONTENT_PAGES = {
  privacy: privacyPage,
  terms: termsPage,
  refunds: refundsPage,
  "vendor-terms": vendorTermsPage,
  about: aboutPage,
  "how-it-works": howItWorksPage,
  help: helpPage,
  contact: contactPage,
} as const;

export type ContentPageKey = keyof typeof CONTENT_PAGES;
