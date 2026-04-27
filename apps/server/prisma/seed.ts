import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const template = await prisma.template.upsert({
    where: { slug: "product-seeding" },
    update: {},
    create: {
      name: "Product Seeding",
      slug: "product-seeding",
      description: "Simple promo template for product storytelling.",
      defaultStrategy: "single"
    }
  });

  const exists = await prisma.templateVersion.findFirst({
    where: {
      templateId: template.id,
      versionNumber: 1
    }
  });

  if (!exists) {
    await prisma.templateVersion.create({
      data: {
        templateId: template.id,
        versionNumber: 1,
        promptSkeleton: "Create a cinematic product video using the script and references.",
        inputSchemaJson: JSON.stringify([
          { key: "script", label: "Script", type: "textarea", required: true }
        ]),
        strategyJson: JSON.stringify({ allowed: ["single", "extend", "storyboard"] })
      }
    });
  }
}

main().finally(() => prisma.$disconnect());
