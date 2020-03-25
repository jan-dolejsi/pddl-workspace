/* --------------------------------------------------------------------------------------------
* Copyright (c) Jan Dolejsi. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.
* ------------------------------------------------------------------------------------------ */

import { FileInfo, Variable } from "../FileInfo";
import { PddlTokenType } from "./PddlTokenizer";
import { PddlSyntaxNode } from "./PddlSyntaxNode";
import { VariablesParser } from "./VariablesParser";
import { DocumentPositionResolver, SimpleDocumentPositionResolver } from "../DocumentPositionResolver";
import { DerivedVariablesParser } from "./DerivedVariableParser";
import { DomainInfo, Action } from "../DomainInfo";
import { PddlSyntaxTree } from "./PddlSyntaxTree";
import { InstantActionParser } from "./InstantActionParser";
import { DurativeActionParser } from "./DurativeActionParser";
import { PddlInheritanceParser } from "./PddlInheritanceParser";
import { PddlConstraintsParser } from "./PddlConstraintsParser";
import { PddlSyntaxTreeBuilder } from "./PddlSyntaxTreeBuilder";

/**
 * Planning Domain parser.
 */
export class PddlDomainParser {
    private domainInfo: DomainInfo | undefined;

    constructor(fileUri: string, fileVersion: number, fileText: string, domainNode: PddlSyntaxNode, syntaxTree: PddlSyntaxTree, private positionResolver: DocumentPositionResolver) {
        const domainNameNode = domainNode.getFirstChild(PddlTokenType.Other, /./);
        if (domainNameNode) {
            const domainName = domainNameNode.getToken().tokenText;

            this.domainInfo = new DomainInfo(fileUri, fileVersion, domainName, syntaxTree, positionResolver);
            this.domainInfo.setText(fileText);
            this.parseDomainStructure();
        }
    }

    static parseText(domainText: string, fileNameOrIdentifier = 'string://noname', version = -1): DomainInfo | undefined {
        const parser = new PddlSyntaxTreeBuilder(domainText);
        const syntaxTree = parser.getTree();
        //(define (domain domain_name)

        const defineNode = syntaxTree.getDefineNode();
        if (!defineNode) { return undefined; }

        const domainNode = defineNode.getFirstOpenBracket('domain');
        if (!domainNode) { return undefined; }

        const positionResolver = new SimpleDocumentPositionResolver(domainText);

        return new PddlDomainParser(fileNameOrIdentifier, version, domainText, domainNode, syntaxTree, positionResolver)
            .getDomain();
    }

    getDomain(): DomainInfo | undefined {
        return this.domainInfo;
    }

    private parseDomainStructure(): void {
        if (this.domainInfo === undefined) { return; }

        const defineNode = this.domainInfo.syntaxTree.getDefineNodeOrThrow();
        PddlDomainParser.parseRequirements(defineNode, this.domainInfo);

        const typesNode = defineNode.getFirstOpenBracket(':types');
        if (typesNode) {
            this.domainInfo.setTypeInheritance(PddlInheritanceParser.parseInheritance(typesNode.getNestedNonCommentText()), typesNode, this.positionResolver);
        }

        const constantsNode = defineNode.getFirstOpenBracket(':constants');
        if (constantsNode) {
            const constantsText = constantsNode.getNestedNonCommentText();
            this.domainInfo.setConstants(PddlInheritanceParser.toTypeObjects(PddlInheritanceParser.parseInheritance(constantsText)));
        }

        const predicatesNode = defineNode.getFirstOpenBracket(':predicates');
        if (predicatesNode) {
            const predicates = new VariablesParser(predicatesNode, this.positionResolver).getVariables();
            this.domainInfo.setPredicates(predicates);
        }

        const functionsNode = defineNode.getFirstOpenBracket(':functions');
        if (functionsNode) {
            const functions = new VariablesParser(functionsNode, this.positionResolver).getVariables();
            this.domainInfo.setFunctions(functions);
        }

        this.domainInfo.setDerived(PddlDomainParser.parseDerived(defineNode, this.positionResolver));

        const instantActions = this.parseActionProcessOrEvent(defineNode, this.positionResolver, "action");
        const durativeActions = this.parseDurativeActions(defineNode, this.positionResolver);
        this.domainInfo.setActions(instantActions.concat(durativeActions));

        const processes = this.parseActionProcessOrEvent(defineNode, this.positionResolver, "process");
        const events = this.parseActionProcessOrEvent(defineNode, this.positionResolver, "event");
        this.domainInfo.setProcesses(processes);
        this.domainInfo.setEvents(events);

        const constraintsNode = defineNode.getFirstOpenBracket(':constraints');
        if (constraintsNode) {
            const constraints = new PddlConstraintsParser().parseConstraints(constraintsNode);
            this.domainInfo.setConstraints(constraints);
        }
    }

    static parseRequirements(defineNode: PddlSyntaxNode, fileInfo: FileInfo): void {
        const requirementsNode = defineNode.getFirstOpenBracket(':requirements');
        if (requirementsNode) {
            const requirements = requirementsNode.getNonWhitespaceChildren()
                .filter(node => node.getToken().type === PddlTokenType.Keyword)
                .map(node => node.getToken().tokenText);
            fileInfo.setRequirements(requirements);
        }
    }

    static parseDerived(defineNode: PddlSyntaxNode, positionResolver: DocumentPositionResolver): Variable[] {
        return defineNode.getChildrenOfType(PddlTokenType.OpenBracketOperator, /\(\s*:derived$/)
            .map(derivedNode => new DerivedVariablesParser(derivedNode, positionResolver).getVariable())
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            .filter(derived => !!derived).map(derived => derived!);
    }

    parseActionProcessOrEvent(defineNode: PddlSyntaxNode, positionResolver: DocumentPositionResolver, keyword: string): Action[] {
        return defineNode.getChildrenOfType(PddlTokenType.OpenBracketOperator, new RegExp("\\(\\s*:" + keyword + "$"))
            .map(actionNode => new InstantActionParser(actionNode, positionResolver).getAction());
    }

    parseDurativeActions(defineNode: PddlSyntaxNode, positionResolver: DocumentPositionResolver): Action[] {
        return defineNode.getChildrenOfType(PddlTokenType.OpenBracketOperator, /\(\s*:durative-action$/)
            .map(actionNode => new DurativeActionParser(actionNode, positionResolver).getAction());
    }
}
