import path from "node:path";
import { SyntaxKind, type SourceFile, type Node, type ArrowFunction, type FunctionExpression } from "ts-morph";
import { generateId } from "@/lib/utils";
import { logger } from "@/lib/logger";
import type { ParsedSymbol, SymbolType } from "./parser-types";

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

function isApiRouteFile(filePath: string): boolean {
  const normalized = path.normalize(filePath).replace(/\\/g, "/");
  return normalized.includes("/api/");
}

function containsJsx(node: Node): boolean {
  let found = false;
  node.forEachDescendant((child) => {
    const kind = child.getKind();
    if (
      kind === SyntaxKind.JsxElement ||
      kind === SyntaxKind.JsxFragment ||
      kind === SyntaxKind.JsxSelfClosingElement
    ) {
      found = true;
      return false;
    }
  });
  return found;
}

function makeSymbol(
  repoId: string,
  name: string,
  symbolType: SymbolType,
  sourceFile: SourceFile,
  node: Node,
  extra: Record<string, unknown> = {},
): ParsedSymbol {
  const linePos = sourceFile.getLineAndColumnAtPos(node.getPos());
  return {
    id: generateId(),
    repoId,
    name,
    symbolType,
    filePath: sourceFile.getFilePath(),
    lineNumber: linePos.line,
    columnNumber: linePos.column,
    exported: false,
    sourceCode: node.getText(),
    metadata: extra,
  };
}

function extractFunctions(
  repoId: string,
  sourceFile: SourceFile,
): ParsedSymbol[] {
  const symbols: ParsedSymbol[] = [];

  for (const fn of sourceFile.getFunctions()) {
    const name = fn.getName();
    if (!name) continue;

    const isComponent = containsJsx(fn);
    const type: SymbolType = isComponent ? "component" : "function";

    symbols.push({
      ...makeSymbol(repoId, name, type, sourceFile, fn),
      exported: fn.isExported(),
      metadata: {
        ...(isComponent ? { isComponent: true } : {}),
        parameters: fn.getParameters().map((p) => p.getName()),
        returnType: fn.getReturnType()?.getText() ?? null,
      },
    });
  }

  return symbols;
}

function extractVariables(
  repoId: string,
  sourceFile: SourceFile,
): ParsedSymbol[] {
  const symbols: ParsedSymbol[] = [];

  for (const varDec of sourceFile.getVariableDeclarations()) {
    const name = varDec.getName();
    if (!name) continue;

    const initializer = varDec.getInitializer();
    if (!initializer) continue;

    const initKind = initializer.getKind();
    const isArrowFn = initKind === SyntaxKind.ArrowFunction;
    const isFnExpr = initKind === SyntaxKind.FunctionExpression;

    if (!isArrowFn && !isFnExpr) continue;

    const isComponent = containsJsx(initializer);
    const type: SymbolType = isComponent ? "component" : "function";

    const varStatement = varDec.getFirstAncestorByKind(SyntaxKind.VariableStatement);
    const isExported = varStatement?.isExported() ?? false;

    let returnTypeText: string | null = null;
    try {
      const typedNode = initializer as ArrowFunction & FunctionExpression;
      if (typeof typedNode.getReturnType === "function") {
        returnTypeText = typedNode.getReturnType().getText() ?? null;
      }
    } catch {
      returnTypeText = null;
    }

    symbols.push({
      ...makeSymbol(repoId, name, type, sourceFile, varDec),
      exported: isExported,
      metadata: {
        ...(isComponent ? { isComponent: true } : {}),
        isArrowFunction: isArrowFn,
        returnType: returnTypeText,
      },
    });
  }

  return symbols;
}

function extractClasses(
  repoId: string,
  sourceFile: SourceFile,
): ParsedSymbol[] {
  const symbols: ParsedSymbol[] = [];

  for (const cls of sourceFile.getClasses()) {
    const name = cls.getName();
    if (!name) continue;

    const heritage: Record<string, string[]> = {};
    const ext = cls.getBaseClass();
    if (ext) {
      heritage.extends = [ext.getText()];
    }
    const impls = cls.getImplements();
    if (impls.length > 0) {
      heritage.implements = impls.map((i) => i.getText());
    }

    symbols.push({
      ...makeSymbol(repoId, name, "class", sourceFile, cls),
      exported: cls.isExported(),
      metadata: {
        heritage,
        memberCount: cls.getMembers().length,
        isDefaultExported: cls.isDefaultExport(),
      },
    });
  }

  return symbols;
}

function extractInterfaces(
  repoId: string,
  sourceFile: SourceFile,
): ParsedSymbol[] {
  const symbols: ParsedSymbol[] = [];

  for (const iface of sourceFile.getInterfaces()) {
    const name = iface.getName();
    if (!name) continue;

    symbols.push({
      ...makeSymbol(repoId, name, "interface", sourceFile, iface),
      exported: iface.isExported(),
      metadata: {
        memberCount: iface.getMembers().length,
        heritage: iface.getExtends().map((e) => e.getText()),
      },
    });
  }

  return symbols;
}

function extractTypeAliases(
  repoId: string,
  sourceFile: SourceFile,
): ParsedSymbol[] {
  const symbols: ParsedSymbol[] = [];

  for (const ta of sourceFile.getTypeAliases()) {
    const name = ta.getName();
    if (!name) continue;

    symbols.push({
      ...makeSymbol(repoId, name, "type", sourceFile, ta),
      exported: ta.isExported(),
      metadata: {
        typeText: ta.getTypeNode()?.getText() ?? null,
      },
    });
  }

  return symbols;
}

function extractImports(
  repoId: string,
  sourceFile: SourceFile,
): ParsedSymbol[] {
  const symbols: ParsedSymbol[] = [];

  for (const imp of sourceFile.getImportDeclarations()) {
    const moduleSpecifier = imp.getModuleSpecifierValue();
    if (!moduleSpecifier) continue;

    const namedImports = imp.getNamedImports().map((n) => n.getName());
    const defaultImport = imp.getDefaultImport()?.getText() ?? null;
    const namespaceImport = imp.getNamespaceImport()?.getText() ?? null;

    symbols.push({
      ...makeSymbol(repoId, `import:${moduleSpecifier}`, "import", sourceFile, imp),
      exported: false,
      metadata: {
        moduleSpecifier,
        namedImports,
        defaultImport,
        namespaceImport,
        isTypeOnly: imp.isTypeOnly(),
      },
    });
  }

  return symbols;
}

function extractExports(
  repoId: string,
  sourceFile: SourceFile,
): ParsedSymbol[] {
  const symbols: ParsedSymbol[] = [];

  for (const exp of sourceFile.getExportDeclarations()) {
    const moduleSpecifier = exp.getModuleSpecifierValue();
    const namedExports = exp.getNamedExports().map((n) => n.getName());

    const name = moduleSpecifier
      ? `reexport:${moduleSpecifier}`
      : namedExports.join(", ");

    symbols.push({
      ...makeSymbol(repoId, name, "export", sourceFile, exp),
      exported: true,
      metadata: {
        moduleSpecifier,
        namedExports,
        isTypeOnly: exp.isTypeOnly(),
      },
    });
  }

  for (const ea of sourceFile.getExportAssignments()) {
    const expr = ea.getExpression();
    const name = expr?.getText() ?? "default";
    symbols.push({
      ...makeSymbol(repoId, `export default ${name}`, "export", sourceFile, ea),
      exported: true,
      metadata: {
        isDefaultExport: true,
        expression: name,
      },
    });
  }

  return symbols;
}

function extractApiRoutes(
  repoId: string,
  sourceFile: SourceFile,
): ParsedSymbol[] {
  if (!isApiRouteFile(sourceFile.getFilePath())) return [];

  const symbols: ParsedSymbol[] = [];

  for (const fn of sourceFile.getFunctions()) {
    const name = fn.getName();
    if (!name || !HTTP_METHODS.has(name)) continue;

    symbols.push({
      ...makeSymbol(repoId, name, "api_route", sourceFile, fn),
      exported: fn.isExported(),
      metadata: {
        httpMethod: name,
        parameters: fn.getParameters().map((p) => p.getName()),
      },
    });
  }

  for (const varDec of sourceFile.getVariableDeclarations()) {
    const name = varDec.getName();
    if (!name || !HTTP_METHODS.has(name)) continue;

    const initializer = varDec.getInitializer();
    if (!initializer) continue;

    symbols.push({
      ...makeSymbol(repoId, name, "api_route", sourceFile, varDec),
      exported: true,
      metadata: {
        httpMethod: name,
      },
    });
  }

  return symbols;
}

export function extractSymbols(
  repoId: string,
  sourceFiles: SourceFile[],
): ParsedSymbol[] {
  const allSymbols: ParsedSymbol[] = [];
  const seen = new Set<string>();

  for (const sf of sourceFiles) {
    const filePath = sf.getFilePath();

    const symbols = [
      ...extractFunctions(repoId, sf),
      ...extractVariables(repoId, sf),
      ...extractClasses(repoId, sf),
      ...extractInterfaces(repoId, sf),
      ...extractTypeAliases(repoId, sf),
      ...extractImports(repoId, sf),
      ...extractExports(repoId, sf),
      ...extractApiRoutes(repoId, sf),
    ];

    for (const sym of symbols) {
      const key = `${sym.symbolType}:${sym.name}:${filePath}:${sym.lineNumber}`;
      if (seen.has(key)) continue;
      seen.add(key);
      allSymbols.push(sym);
    }
  }

  logger.info("symbol-extractor", "Symbols extracted", {
    total: allSymbols.length,
    files: sourceFiles.length,
    repoId,
  });

  return allSymbols;
}
