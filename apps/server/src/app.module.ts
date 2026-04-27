import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { TemplatesModule } from "./templates/templates.module";
import { MediaAssetsModule } from "./media-assets/media-assets.module";
import { GenerationJobsModule } from "./generation-jobs/generation-jobs.module";

@Module({
  imports: [PrismaModule, TemplatesModule, MediaAssetsModule, GenerationJobsModule],
  controllers: [HealthController]
})
export class AppModule {}
