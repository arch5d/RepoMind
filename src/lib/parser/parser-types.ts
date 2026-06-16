export type SymbolType =
  | "function"
  | "class"
  | "interface"
  | "type"
  | "import"
  | "export"
  | "component"
  | "api_route";

export type Relationship =
  | "imports"
  | "exports"
  | "extends"
  | "implements"
  | "composes";

export interface ParsedSymbol {
  id: string;
  repoId: string;
  name: string;
  symbolType: SymbolType;
  filePath: string;
  lineNumber: number;
  columnNumber: number;
  exported: boolean;
  sourceCode: string;
  metadata: Record<string, unknown>;
}

export interface Dependency {
  id: string;
  repoId: string;
  sourceId: string;
  targetId: string | null;
  sourceSymbol: string;
  targetSymbol: string;
  sourceFile: string;
  targetFile: string;
  relationship: Relationship;
}

export interface ParseResult {
  repoId: string;
  symbols: ParsedSymbol[];
  dependencies: Dependency[];
  filesParsed: number;
  filesTotal: number;
  durationMs: number;
}

export interface ParserConfig {
  repoId: string;
  repoDir: string;
  ignorePatterns?: string[];
  onProgress?: (progress: number) => void;
}
