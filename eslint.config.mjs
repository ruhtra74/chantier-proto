import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/.angular/**",
      "apps/api/src/generated/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ["blender/**/*.mjs", "apps/web/scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        URL: "readonly",
      },
    },
  },
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
