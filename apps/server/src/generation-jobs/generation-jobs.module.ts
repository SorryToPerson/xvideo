import { Module } from "@nestjs/common";
import { GenerationJobsController } from "./generation-jobs.controller";
import { GenerationJobsService } from "./generation-jobs.service";
import { SeedanceModule } from "../providers/seedance/seedance.module";

@Module({
  imports: [SeedanceModule],
  controllers: [GenerationJobsController],
  providers: [GenerationJobsService]
})
export class GenerationJobsModule {}
