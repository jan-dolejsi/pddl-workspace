# PDDL parsing and workspace

[![CI](https://github.com/jan-dolejsi/pddl-workspace/workflows/Build/badge.svg)](https://github.com/jan-dolejsi/pddl-workspace/actions?query=workflow%3ABuild)
[![npm](https://img.shields.io/npm/v/pddl-workspace)](https://www.npmjs.com/package/pddl-workspace)

## PDDL Parser

Disclaimer: this is not a full PDDL syntax parser. Its purpose is to provide language support in VS Code, so mode than a parser, it is a syntax tree builder. In other words, the parser does not give access to complete PDDL object model, but works even in incomplete or syntactically incorrect documents.

Example usage:

```typescript
import { parser, DomainInfo, ProblemInfo, Plan, Happening, HappeningType, utils } from 'pddl-workspace';

const parsedDomain = parser.PddlDomainParser.parseText(domainText);
const parsedProblem = await parser.PddlProblemParser.parseText(problemText);
```
