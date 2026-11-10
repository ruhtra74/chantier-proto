import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/coverage/**", "**/.angular/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ["packages/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@babylonjs/*",
                "@angular/*",
                "@nestjs/*",
                "react",
                "react/*",
                "three",
                "three/*",
                "express",
                "express/*",
              ],
              message:
                "Le paquet domain ne doit dépendre d'aucune bibliothèque 3D, d'interface ou réseau.",
            },
            {
              group: ["node:*", "fs", "fs/*", "http", "https", "net", "crypto"],
              message:
                "Le paquet domain doit rester pur : ni accès disque, ni réseau, ni aléatoire système.",
            },
          ],
        },
      ],
    },
  },
);
