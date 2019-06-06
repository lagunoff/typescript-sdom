import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

type SourceFile = string;
type Tests = Record<SourceFile, Test[]>;
type Test = { symbol: string, code: string };

export function generateDocs(fileNames: string[], options: ts.CompilerOptions): Tests {
  const output: Tests = {};
  const program = ts.createProgram(fileNames, options);

  // Get the checker, we will use it to find more about classes
  const checker = program.getTypeChecker();

  // Visit every sourceFile in the program
  for (const sourceFile of program.getSourceFiles()) {
    const filePath = path.relative(path.join(__dirname, '..'), sourceFile.fileName);
    const tests: Test[] = [];
    if (!sourceFile.isDeclarationFile) {
      // Walk the tree to search for classes
      ts.forEachChild(sourceFile, x => visit(tests, x));
    }
    if (tests.length) output[filePath] = tests;
  }

  return output;
  
  function visit(output: Test[], node: ts.Node) {
    if (ts.isFunctionDeclaration(node)) {
      const symbol = checker.getSymbolAtLocation(node) || node['symbol']; if (!symbol) return;
      const doc = ts.displayPartsToString(symbol.getDocumentationComment(checker)).replace(/\n\s*\* /g, '\n');
      const code = getIndentedCode(doc);
      if (code) output.push({ symbol: symbol.getName(), code });
    }
  }
}
  
function getIndentedCode(doc: string): string|null {
  let output: string = '';
  doc.split('\n').forEach(line => line.startsWith('    ') ? (output += line.replace(/^    /, '') + '\n') : void 0);
  return output || null;
}

function printTest(test: Test): string {
  return `describe(${JSON.stringify(test.symbol)}, () => {
  it('test #1', () => {\n    `
    + test.code.split('\n').filter(Boolean).join('\n    ') + `\n  });\n});`;
}

const epilog = `require('jsdom-global')();
const assert = require('chai').assert;
import { h } from '../src';
import { elem, array, attach, text } from '../src/sdom';
`;

const fileNames = ['./src/sdom.ts']
const tests = generateDocs(fileNames, { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS });
const testContent = Object.keys(tests).map(file => '// --[ ' + file + ' ]--\n' +  tests[file].map(printTest).join('\n\n')).join('\n');
fs.writeFileSync('./tests/01-doctest.ts', epilog + '\n\n' + testContent);
