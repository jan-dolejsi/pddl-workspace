# PDDL parsing and workspace

[![CI](https://github.com/jan-dolejsi/pddl-workspace/workflows/Build/badge.svg)](https://github.com/jan-dolejsi/pddl-workspace/actions?query=workflow%3ABuild)
[![npm](https://img.shields.io/npm/v/pddl-workspace)](https://www.npmjs.com/package/pddl-workspace)

Install this package using `npm install pddl-workspace`.

## PDDL Parser

Disclaimer: this is not a full PDDL syntax parser. Its purpose is to provide language support in VS Code, so mode than a parser, it is a syntax tree builder. In other words, the parser does not give access to complete PDDL object model, but works even in incomplete or syntactically incorrect documents.
You could however successfully use it to extract predicates, functions, actions from the PDDL files.

Example usage:

```typescript
import { parser, DomainInfo, ProblemInfo, Plan, Happening, HappeningType, utils } from 'pddl-workspace';

const domain = parser.PddlDomainParser.parseText(domainText);
const problem = await parser.PddlProblemParser.parseText(problemText);
const epsilon = 0.001;

const planText = `
;;!domain: domain1
;;!problem: problem1

0.00100: (action p1 p2) [10.00]

; Makespan: 10.001
; Cost: 123.456
; States evaluated: 2`;

const plan = PddlPlanParser.parseText(planText, epsilon);
```

Many more usage scenarios are exercised in the unit tests in the `test` folder.

## PDDL Workspace

The _workspace_ groups features necessary for interactive authoring of PDDL files.
And management of such files. The `PddlWorkspace` class is used by the VS Code PDDL extension.

```typescript
import { URI } from 'vscode-uri';
```

```typescript
const pddlWorkspace = new PddlWorkspace(1e-3);
const insertedFiles: FileInfo[] = [];

// get notified about new/updated files
pddlWorkspace.on(PddlWorkspace.INSERTED, (file: FileInfo) => {
    console.log(`Inserted: '${file.name}' from ${file.fileUri}.`);
})

pddlWorkspace.on(PddlWorkspace.UPDATED, (file: FileInfo) => {
    console.log(`Updated: '${file.name}' from ${file.fileUri}.`);
})

const pddlDomainText = `(define (domain domain_name) )`;
const pddlProblemText = `(define (problem p1) (:domain domain_name))`;

// WHEN
const domainInfo = await pddlWorkspace.upsertFile(
    URI.parse('file:///folder1/domain.pddl),
    PddlLanguage.PDDL,
    1, // content version
    pddlDomainText,
    new SimpleDocumentPositionResolver(pddlDomainText));

const problemInfo = await pddlWorkspace.upsertFile(
    URI.parse('file:///folder1/problem.pddl'),
    PddlLanguage.PDDL,
    1, // content version
    pddlProblemText,
    new SimpleDocumentPositionResolver(pddlProblemText));

const correspondingDomain = pddlWorkspace.getDomainFileFor(problemInfo as ProblemInfo);

// now do something like `solve(correspondingDomain, problemInfo)`

```

### Extending PDDL Workspace with custom syntaxes and functionality

Creators of non-standard PDDL syntaxes, parsers, planning enginens can inject
their extensions to the `PddlWorkspace`. Here is how:

```typescript
class CustomPddlFile extends FileInfo {
    getLanguage(): PddlLanguage {
        return PddlLanguage.PDDL;
    }
}

class CustomParser extends PddlFileParser<CustomPddlFile> {
    async tryParse(fileUri: URI, fileVersion: number, fileText: string, syntaxTree: PddlSyntaxTree, positionResolver: DocumentPositionResolver): Promise<CustomPddlFile | undefined> {
        if ('(:custom-pddl') {
            return new CustomPddlFile(fileUri, fileVersion, 'custom', syntaxTree, positionResolver);
        }
    }
}

class CustomExtension extends PddlWorkspaceExtension {
    getPddlParsers(): PddlFileParser<FileInfo>[] | undefined {
        return [new CustomParser()];
    }
}

const pddlWorkspace = new PddlWorkspace(1e-3);
pddlWorkspace.addExtension(new CustomExtension());
const pddlText = `(:custom-pddl)`;

// WHEN
const parsedFile = await pddlWorkspace.upsertFile(URI.parse('file:///test'), PddlLanguage.PDDL, 1, pddlText, new SimpleDocumentPositionResolver(pddlText));
```
