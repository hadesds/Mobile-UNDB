import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Usa o compilador já instalado para executar módulos TS com imports usados pelo Metro.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (erro) {
      if (erro.code !== "ERR_MODULE_NOT_FOUND" || !specifier.startsWith(".")) throw erro;
      return nextResolve(`${specifier}.ts`, context);
    }
  },
  load(url, context, nextLoad) {
    if (!url.endsWith(".ts") || !url.includes("/frontend/src/")) return nextLoad(url, context);
    return {
      format: "module", shortCircuit: true,
      source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      }).outputText,
    };
  },
});
