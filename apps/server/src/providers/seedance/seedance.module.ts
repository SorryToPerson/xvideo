import { Module } from "@nestjs/common";
import { SeedanceService } from "./seedance.service";

@Module({
  providers: [SeedanceService],
  exports: [SeedanceService]
})
export class SeedanceModule {}
