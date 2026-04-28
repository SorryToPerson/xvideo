import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const template = await prisma.template.upsert({
    where: { slug: "product-seeding" },
    update: {
      name: "产品种草短片",
      description: "适合普通用户快速制作产品展示和种草类短视频。"
    },
    create: {
      name: "产品种草短片",
      slug: "product-seeding",
      description: "适合普通用户快速制作产品展示和种草类短视频。",
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
        promptSkeleton: "根据用户脚本和参考图，生成一条有质感的产品视频。",
        inputSchemaJson: JSON.stringify([
          { key: "script", label: "创意脚本", type: "textarea", required: true }
        ]),
        strategyJson: JSON.stringify({ allowed: ["single", "extend", "storyboard"] })
      }
    });
  }
}

main().finally(() => prisma.$disconnect());
