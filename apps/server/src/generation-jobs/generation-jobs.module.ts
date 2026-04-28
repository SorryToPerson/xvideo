import { Module } from "@nestjs/common";
import { GenerationJobsController } from "./generation-jobs.controller";
import { GenerationJobsService } from "./generation-jobs.service";
import { MediaAssetsModule } from "../media-assets/media-assets.module";
import { SeedanceModule } from "../providers/seedance/seedance.module";

@Module({
  imports: [SeedanceModule, MediaAssetsModule],
  controllers: [GenerationJobsController],
  providers: [GenerationJobsService]
})
export class GenerationJobsModule {}
