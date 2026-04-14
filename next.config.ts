import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
  jsxImportSource: 'react',
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
