import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { getScenario, type Scenario } from "@chantier/domain";

/** Les scénarios viennent du paquet `domain`, validés par Zod à son chargement. */
@Controller("scenarios")
export class ScenariosController {
  @Get(":id")
  findOne(@Param("id") id: string): Scenario {
    const scenario = getScenario(id);
    if (!scenario) throw new NotFoundException(`Scénario inconnu : ${id}`);
    return scenario;
  }
}
