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
