import { readFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/db/prisma";
import { DUO_BANNER_SORT_BASE } from "@/lib/home/banner-placement";
import { env } from "@/config/env.shared";
import { v2 as cloudinary } from "cloudinary";

type CliOptions = {
  leftPath: string;
  rightPath: string;
  width: number;
  height: number;
};

const DEFAULT_LEFT = "public/home/sections/banner-01-quality-grocery.png";
const DEFAULT_RIGHT = "public/banners/banner-2.webp";
const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 300;

function parseArgs(argv: string[]): CliOptions {
  const args = new Map<string, string>();

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) continue;
    args.set(token, value);
    i += 1;
  }

  const width = Number(args.get("--width") ?? DEFAULT_WIDTH);
  const height = Number(args.get("--height") ?? DEFAULT_HEIGHT);

  if (!Number.isFinite(width) || width < 100) {
    throw new Error("--width must be a number >= 100");
  }

  if (!Number.isFinite(height) || height < 80) {
    throw new Error("--height must be a number >= 80");
  }

  return {
    leftPath: args.get("--left") ?? DEFAULT_LEFT,
    rightPath: args.get("--right") ?? DEFAULT_RIGHT,
    width: Math.round(width),
    height: Math.round(height),
  };
}

function mimeTypeForPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  throw new Error(`Unsupported image extension for ${filePath}`);
}

function transformedUrl(publicId: string, width: number, height: number): string {
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      {
        width,
        height,
        crop: "fill",
        gravity: "auto",
        fetch_format: "auto",
        quality: "auto",
      },
    ],
  });
}

function ensureCloudinaryConfigured() {
  const cloudName = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary env vars are missing");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

function uploadBufferToCloudinary(buffer: Buffer) {
  return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "mandawee/admin/home-banners",
        resource_type: "image",
        use_filename: true,
        unique_filename: true,
      },
      (err, res) => {
        if (err) {
          reject(err);
          return;
        }

        if (!res?.secure_url || !res.public_id) {
          reject(new Error("Upload failed"));
          return;
        }

        resolve({ secure_url: res.secure_url, public_id: res.public_id });
      }
    );

    stream.end(buffer);
  });
}

async function uploadAndTransform(filePath: string, width: number, height: number) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const buffer = await readFile(absolutePath);
  mimeTypeForPath(absolutePath);

  const upload = await uploadBufferToCloudinary(buffer);

  return {
    source: filePath,
    uploadedUrl: upload.secure_url,
    transformed: transformedUrl(upload.public_id, width, height),
  };
}

async function main() {
  ensureCloudinaryConfigured();
  const options = parseArgs(process.argv.slice(2));

  const duoBanners = await prisma.homeBanner.findMany({
    where: {
      placement: "SECTION",
      sortOrder: { gte: DUO_BANNER_SORT_BASE },
    },
    orderBy: { sortOrder: "asc" },
    take: 2,
  });

  if (duoBanners.length < 2) {
    throw new Error(`Expected 2 DUO banners, found ${duoBanners.length}`);
  }

  const left = await uploadAndTransform(options.leftPath, options.width, options.height);
  const right = await uploadAndTransform(options.rightPath, options.width, options.height);

  await prisma.homeBanner.update({
    where: { id: duoBanners[0].id },
    data: {
      imageUrl: left.transformed,
      imageMobileUrl: left.transformed,
      updatedAt: new Date(),
    },
  });

  await prisma.homeBanner.update({
    where: { id: duoBanners[1].id },
    data: {
      imageUrl: right.transformed,
      imageMobileUrl: right.transformed,
      updatedAt: new Date(),
    },
  });

  console.log("Updated DUO banners with forced same dimensions:");
  console.log(`- Left  (${duoBanners[0].id}): ${left.source}`);
  console.log(`  ${left.transformed}`);
  console.log(`- Right (${duoBanners[1].id}): ${right.source}`);
  console.log(`  ${right.transformed}`);
  console.log(`- Forced size: ${options.width}x${options.height}`);
}

main()
  .catch((error) => {
    console.error("Failed to replace DUO banners:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
