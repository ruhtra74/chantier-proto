import { BadRequestException, type PipeTransform } from "@nestjs/common";
import type { z } from "zod";

/**
 * Tube de validation réutilisable : valide la valeur avec un schéma Zod (en général issu de
 * `@chantier/domain`) et renvoie la valeur typée, ou une erreur 400 listant les problèmes.
 *
 * Usage : `@Body(new ZodValidationPipe(sessionSubmissionSchema)) body: SessionSubmission`.
 */
export class ZodValidationPipe<S extends z.ZodType> implements PipeTransform<unknown, z.output<S>> {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.output<S> {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;

    throw new BadRequestException({
      message: "Requête invalide",
      issues: result.error.issues.map((issue) => ({
        path: issue.path.map(String).join("."),
        message: issue.message,
      })),
    });
  }
}
