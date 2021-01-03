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

const plan = parser.PddlPlanParser.parseText(planText, epsilon);
```

Many more usage scenarios are exercised in the unit tests in the `test` folder.

Plans may appear in number of different formats. Following forms are supported:

```text
(action)
(action objects)
time: (action)
time: (action) [duration]
time: (action) [D:<duration>; C:<actionCost>]
```

### PDDL Numeric Expression Parser

PDDL problem files support multiple `(:metric )` elements (because VAL does as well).
The numeric expression inside the metric is parsed to a syntax tree. The parser is available:

```typescript
const expressionPddl = "(/ (- (cost) (minCost)) 2)";

const expression = createNumericExpressionParser(expressionPddl).getExpression();

const division = expression as Division;
division.getVariableNames(); // returns ['cost', 'minCost']

const context = new ValueMap("cost", 3, "minCost", 2);
division.evaluate(context); // returns 0.5

function createNumericExpressionParser(metricPddl: string): NumericExpressionParser {
    const syntaxTree = new PddlSyntaxTreeBuilder(metricPddl).getTree();
    return new NumericExpressionParser(
        syntaxTree.getRootNode().getSingleNonWhitespaceChild());
}
```

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
    URI.parse('file:///folder1/domain.pddl'),
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
their extensions to the `PddlWorkspace`. Here is how (full working code is in `CustomPddlParserExtension.ts`):

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

class CustomExtension implements PddlWorkspaceExtension {
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

### Extending PDDL VS Code Extension with custom planner configuration providers

The `pddl-workspace` package is the external API of the PDDL VS Code extension.
To make it convenient for your users to configure and use your planner in VS Code,
implement the `PlannerProvider` interface (see full working code in `CustomPlannerProvider.ts`):

```typescript
export const plannerKind = new planner.PlannerKind("my-planning-service");

export class SolveServicePlannerProvider implements planner.PlannerProvider {
    get kind(): planner.PlannerKind {
        return plannerKind;
    }
    getNewPlannerLabel(): string {
        return "$(cloud-upload) Input a planning service URL...";
    }

    async configurePlanner(previousConfiguration?: planner.PlannerConfiguration): Promise<planner.PlannerConfiguration | undefined> {
        const existingValue = previousConfiguration?.url ?? "http://solver.planning.domains/solve";

        const previouslyUsedUri = URI.parse(existingValue);

        console.log(`Previously, you configured ${previouslyUsedUri.toString()}, what do you want to change it to?`);

        // let's pretend the user entered 'http://solver.planning.domains/solve'
        const newPlannerUrl = 'http://solver.planning.domains/solve';

        return this.createPlannerConfiguration(newPlannerUrl);
    }

    createPlannerConfiguration(newPlannerUrl: string): planner.PlannerConfiguration {
        return {
            kind: this.kind.kind,
            url: newPlannerUrl,
            title: newPlannerUrl,
            canConfigure: true
        };
    }
}


/**
 * Example custom Planner Provider extension.
 */
export class CustomPlannerProviderExtension implements PddlWorkspaceExtension {
    getPlannerProvider(): PlannerProvider[] | undefined {
        return [new SolveServicePlannerProvider()];
    }
}
```

Starting from version 3.5.0, the `PlannerProvider` may optionally also implement custom creation of the `Planner`. Here is an example for composing `java -jar xyz.jar` command-line:

```typescript
    createPlanner(configuration: planner.PlannerConfiguration, plannerOptions: string, workingDirectory: string): planner.Planner {
        return new PlannerExecutable(`java -jar ${configuration.path}`, plannerOptions, configuration.syntax, workingDirectory);
    }
```

## Compiling and contributing

Install node.js 12.14.1.
