import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const root = process.cwd();

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", "admin", "account"].includes(entry.name)) continue;
      // skip vendor dashboard routes but keep vendor/register
      walk(full, out);
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const publicRoots = [
  "app/[locale]/page.tsx",
  "app/[locale]/products",
  "app/[locale]/category",
  "app/[locale]/cart",
  "app/[locale]/checkout",
  "app/[locale]/orders",
  "app/[locale]/auth",
  "app/[locale]/baby-packages",
  "app/[locale]/deals",
  "app/[locale]/vendors",
  "app/[locale]/about",
  "app/[locale]/contact",
  "app/[locale]/help",
  "app/[locale]/how-it-works",
  "app/[locale]/privacy",
  "app/[locale]/terms",
  "app/[locale]/refunds",
  "app/[locale]/gifts",
  "app/[locale]/hawala",
  "app/[locale]/vendor/register",
  "app/[locale]/vendor/terms",
  "components/cart",
  "components/products",
  "components/categories",
  "components/orders",
  "components/baby-packages",
  "components/vendors",
  "components/layout",
  "components/home",
  "components/auth",
  "components/address",
  "components/ui/PageLoader.tsx",
  "components/ui/SearchableSelect.tsx",
  "components/vendor/VendorOnboardingWizard.tsx",
  "components/vendor/VendorRegisterShowcase.tsx",
];

const patterns = [
  [/aria-label="Breadcrumb"/g, "hardcoded Breadcrumb aria"],
  [/Loading login\.\.\./g, "hardcoded Loading login"],
  [/Loading signup\.\.\./g, "hardcoded Loading signup"],
  [/Decrease quantity/g, "hardcoded Decrease quantity"],
  [/Increase quantity/g, "hardcoded Increase quantity"],
  [/Remove from wishlist/g, "hardcoded wishlist remove"],
  [/Add to wishlist/g, "hardcoded wishlist add"],
  [/"Sold out"/g, "hardcoded Sold out"],
  [/`Coupon \$\{/g, "hardcoded Coupon toast"],
  [/Preparing onboarding/g, "hardcoded Preparing onboarding"],
  [/aria-label="Loading cart"/g, "hardcoded Loading cart aria"],
  [/aria-label="Loading products"/g, "hardcoded Loading products aria"],
];

const hits = [];
for (const rel of publicRoots) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) continue;
  const files = fs.statSync(full).isDirectory() ? walk(full) : [full];
  for (const file of files) {
    // skip vendor dashboard under app/[locale]/vendor except register/terms
    if (file.includes(`${path.sep}vendor${path.sep}`) && !file.includes("register") && !file.includes("terms") && !file.includes("VendorOnboarding") && !file.includes("VendorRegister")) {
      continue;
    }
    const text = fs.readFileSync(file, "utf8");
    for (const [re, label] of patterns) {
      re.lastIndex = 0;
      if (re.test(text)) hits.push({ file: path.relative(root, file), label });
    }
  }
}

// metadata english check on public pages
const metaHits = [];
const metaFiles = [
  "app/[locale]/baby-packages/page.tsx",
  "app/[locale]/deals/page.tsx",
  "app/[locale]/about/page.tsx",
  "app/[locale]/contact/page.tsx",
  "app/[locale]/help/page.tsx",
  "app/[locale]/how-it-works/page.tsx",
  "app/[locale]/privacy/page.tsx",
  "app/[locale]/terms/page.tsx",
  "app/[locale]/refunds/page.tsx",
  "app/[locale]/vendor/terms/page.tsx",
];
for (const rel of metaFiles) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) continue;
  const text = fs.readFileSync(full, "utf8");
  if (/export const metadata|generateMetadata|buildContentPageMetadata/.test(text)) {
    metaHits.push(rel);
  }
}

console.log(
  JSON.stringify(
    {
      leftoverHardcodedHits: hits,
      englishMetadataPages: metaHits,
      pageLoaderDefaultStillEnglish: fs
        .readFileSync(path.join(root, "components/ui/PageLoader.tsx"), "utf8")
        .includes('message = "Loading..."'),
    },
    null,
    2
  )
);
