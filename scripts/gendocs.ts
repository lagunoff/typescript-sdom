import * as ts from 'typescript';
import { omit, isEmpty, values, uniq } from 'lodash';
import { forEachComment } from 'tsutils';
import * as fs from 'fs';
import * as path from 'path';

declare const Promise: any;


type DocEntry =
  | { tag: 'Class', name: string, documentation: string }
  | { tag: 'Type', name: string, documentation: string, type: string }
  | { tag: 'Function', name: string, documentation: string, signatures: string[] }
  | { tag: 'Method', parent: string, name: string, documentation: string, signatures: string[] }


type Docs = Record<string, Record<string, DocEntry>>;


export function generateDocs(fileNames: string[], options: ts.CompilerOptions) {
  const docs: Docs = {};
  const program = ts.createProgram(fileNames, options);

  // Get the checker, we will use it to find more about classes
  const checker = program.getTypeChecker();

  // Visit every sourceFile in the program
  for (const sourceFile of program.getSourceFiles()) {
    const filePath = path.relative(path.join(__dirname, '..'), sourceFile.fileName);
    docs[filePath] = {};
    if (!sourceFile.isDeclarationFile) {
      // Walk the tree to search for classes
      ts.forEachChild(sourceFile, x => visit(docs[filePath], x));
    }
  }

  return docs;
  
  function visit(output: Record<string, DocEntry>, node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && isNodeExported(node)) {
      const symbol = checker.getSymbolAtLocation(node) || node['symbol'];
      if (symbol && !output.hasOwnProperty(symbol.getName())) {
        output[symbol.getName()] = serializeFunction(node, symbol);
      }
    } else if (ts.isClassDeclaration(node) && node.name && isNodeExported(node)) {
      const symbol = checker.getSymbolAtLocation(node.name) || node['symbol'];
      if (symbol && !output.hasOwnProperty(symbol.getName())) {
        output[symbol.getName()] = serializeClass(symbol);
      }
      ts.forEachChild(node, x => visit(output, x));
    } else if (ts.isMethodDeclaration(node)) {
      const symbol = checker.getSymbolAtLocation(node.name) || node['symbol'];
      const parent = checker.getSymbolAtLocation(node.parent) || node.parent['symbol'];
      const name = parent ? `${parent.getName()}.prototype.${symbol!.getName()}` : symbol!.getName();
      if (symbol && parent && !output.hasOwnProperty(name)) {
        output[name] = serializeMethod(node, symbol, parent);
      }
    } else if (ts.isVariableStatement(node)) {
      const declarationNode = node.declarationList.declarations[0];
      const symbol = checker.getSymbolAtLocation(declarationNode) || declarationNode['symbol'];
      if (symbol && !output.hasOwnProperty(symbol.getName())) {
        output[symbol.getName()] = serializeFunction(declarationNode, symbol);
      }
    } else if (ts.isTypeAliasDeclaration(node) && isNodeExported(node)) {
      node.type
      const symbol = checker.getSymbolAtLocation(node) || node['symbol'];
      if (symbol && !output.hasOwnProperty(symbol.getName())) {
        output[symbol.getName()] = serializeTypeAlias(node, symbol);
      }
    }
  }

  /** Serialize a class symbol information */
  function serializeClass(symbol: ts.Symbol): DocEntry {
    return {
      tag: 'Class',
      name: symbol.name,
      documentation: processIndentedCode(ts.displayPartsToString(symbol.getDocumentationComment(checker)).replace(/\n\s*\* /g, '\n')),
    };
  }

  /** Serialize function **/
  function serializeFunction(node: ts.Node, symbol: ts.Symbol): DocEntry {
    const functionType = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!);
    
    return {
      tag: 'Function',
      name: symbol.getName(),

      documentation: processIndentedCode(ts.displayPartsToString(symbol.getDocumentationComment(checker)).replace(/\n\s*\* /g, '\n')),
      signatures: functionType.getCallSignatures().map(x => checker.signatureToString(x, node, ts.TypeFormatFlags.NoTruncation|ts.TypeFormatFlags.WriteArrayAsGenericType|ts.TypeFormatFlags.UseFullyQualifiedType)),
    };
  }

  /** Serialize type alias **/
  function serializeTypeAlias(node: ts.TypeAliasDeclaration, symbol: ts.Symbol): DocEntry {
    return {
      tag: 'Type',
      name: symbol.getName(),
      documentation: processIndentedCode(ts.displayPartsToString(symbol.getDocumentationComment(checker)).replace(/\n\s*\* /g, '\n')),
      type: node.getText(), // checker.typeToString(checker.getTypeFromTypeNode(node.type)),
    };
  }

  
  /** Serialize method **/
  function serializeMethod(node: ts.Node, symbol: ts.Symbol, parent: ts.Symbol): DocEntry {
    const functionType = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!);
    return {
      tag: 'Method',
      parent: parent.getName(),
      name: symbol.getName(),
      documentation: ts.displayPartsToString(symbol.getDocumentationComment(checker)).replace(/\n\s*\* /g, '\n'),
      signatures: functionType.getCallSignatures().map(x => checker.signatureToString(x, undefined, ts.TypeFormatFlags.NoTruncation)),
    };
  }

}


/** True if this is visible outside this file, false otherwise */
function isNodeExported(node: ts.Declaration): boolean {
  return (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0 || (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile);
}


function generateMarkdown(docs: Docs, files: string[] = Object.keys(docs)): string {
  let contents = '';
  let output = '';
  for (const k of files) {
    if (isEmpty(docs[k])) continue;
    addModule(k);
  }
  return /*contents + */output;

  function addModule(mod: string) {
    contents += ` * [${mod}](#${mod.replace(/\W/g, '').toLowerCase()})\n`;
    // output += `\n\n## ${mod}\n\n`;
    values(docs[mod]).map(processEntry).forEach(x => {
      if (!x) return;
      contents += `   * [${x.title}](#${x.title.replace(/\W/g, '').toLowerCase()})\n`;
      output += `${x.output}\n\n`;
    });
  }

  function processEntry(entry: DocEntry): null| { title: string, output: string } {
    if (!entry.documentation) return null;
    switch (entry.tag) {
      case 'Class': {
        const title = `class ${entry.name}`;
        return { title, output: `#### ${title}\n\n${entry.documentation}` };
      }
      case 'Type': {
        const title = `type ` + entry.name;
        const declaration = entry.type
        return { title, output: `#### ${title}\n\n` + '```ts\n' + declaration + '\n```' + `\n\n${entry.documentation}` };
      }
      case 'Function': {
        const title = entry.name;
        const signatures = entry.signatures.map(x => 'function ' + entry.name + x + ';');
        return { title, output: `#### ${title}\n\n${'`' + signatures.join('\n') + '`\n\n'}${entry.documentation}` };
      }
      case 'Method': {
        const title = `${entry.parent}.prototype.${entry.name}`;
        const signatures = entry.signatures.map(x => entry.name + x + ';');

        return { title, output: `#### ${title}\n\n${'```ts\n' + signatures.join('\n') + '\n```\n\n'}${entry.documentation}` };
      }
    }
  }
}

function processIndentedCode(doc: string) {
  return doc.split('\n').map((line, idx, xs) => {
    if (line.startsWith('    ')) {
      const isStart = idx === 0 || !xs[idx - 1].startsWith('    ');
      const isEnd = idx === xs.length - 1 || !xs[idx + 1].startsWith('    ');
      return (isStart ? '```ts\n' : '') + line.replace(/^    /, '') + (isEnd ? '\n```' : '');
    }
    return line;
  }).join('\n');
}

const priority = ['src/index.ts'];
const fileNames = process.argv.slice(2);
const docEntries = generateDocs(fileNames, { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS });
console.log(generateMarkdown(docEntries, priority));
