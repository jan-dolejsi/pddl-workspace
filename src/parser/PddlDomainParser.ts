/* --------------------------------------------------------------------------------------------
* Copyright (c) Jan Dolejsi. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.
* ------------------------------------------------------------------------------------------ */

import { FileInfo } from "../FileInfo";
import { PddlTokenType } from "./PddlTokenizer";
import { PddlSyntaxNode } from "./PddlSyntaxNode";
import { VariablesParser } from "./VariablesParser";
import { DocumentPositionResolver, SimpleDocumentPositionResolver } from "../DocumentPositionResolver";
import { DerivedVariablesParser } from "./DerivedVariableParser";
import { DomainInfo, Action, DurativeAction } from "../DomainInfo";
import { PddlSyntaxTree } from "./PddlSyntaxTree";
import { InstantActionParser } from "./InstantActionParser";
import { DurativeActionParser } from "./DurativeActionParser";
import { PddlInheritanceParser } from "./PddlInheritanceParser";
import { PddlConstraintsParser } from "./PddlConstraintsParser";
import { PddlSyntaxTreeBuilder } from "./PddlSyntaxTreeBuilder";
import { Variable } from "../language";
import { PddlFileParser } from "./PddlFileParser";
import { URI } from "vscode-uri";

/**
 * Planning Domain parser.
 */
export class PddlDomainParser extends PddlFileParser<DomainInfo> {
    async tryParse(fileUri: URI, fileVersion: number, fileText: string, syntaxTree: PddlSyntaxTree, positionResolver: DocumentPositionResolver): Promise<DomainInfo | undefined> {
        //(define (domain domain_name)

        const defineNode = syntaxTree.getDefineNode();
        if (!defineNode) { return undefined; }

        const domainNode = defineNode.getFirstOpenBracket('domain');
        if (!domainNode) { return undefined; }

        return this.parse(fileUri, fileVersion, fileText, domainNode, syntaxTree, positionResolver);
    }

    parse(fileUri: URI, fileVersion: number, fileText: string, domainNode: PddlSyntaxNode,
        syntaxTree: PddlSyntaxTree, positionResolver: DocumentPositionResolver): DomainInfo | undefined {
        const domainNameNode = domainNode.getFirstChild(PddlTokenType.Other, /./);
        if (!domainNameNode) return undefined;

        const domainName = domainNameNode.getToken().tokenText;

        const domainInfo = new DomainInfo(fileUri, fileVersion, domainName, syntaxTree, positionResolver);
        domainInfo.setText(fileText);
        this.parseDomainStructure(domainInfo, positionResolver);
        return domainInfo;
    }

    static parseText(domainText: string, fileNameOrIdentifier = URI.parse('string://noname'), version = -1): DomainInfo | undefined {
        const parser = new PddlSyntaxTreeBuilder(domainText);
        const syntaxTree = parser.getTree();
        //(define (domain domain_name)

        const defineNode = syntaxTree.getDefineNode();
        if (!defineNode) { return undefined; }

        const domainNode = defineNode.getFirstOpenBracket('domain');
        if (!domainNode) { return undefined; }

        const positionResolver = new SimpleDocumentPositionResolver(domainText);

        return new PddlDomainParser().parse(fileNameOrIdentifier, version, domainText, domainNode, syntaxTree, positionResolver);
    }

    private parseDomainStructure(domainInfo: DomainInfo, positionResolver: DocumentPositionResolver): void {

        const defineNode = domainInfo.syntaxTree.getDefineNodeOrThrow();
        PddlDomainParser.parseRequirements(defineNode, domainInfo);

        const typesNode = defineNode.getFirstOpenBracket(':types');
        if (typesNode) {
            domainInfo.setTypeInheritance(PddlInheritanceParser.parseInheritance(typesNode.getNestedNonCommentText()), typesNode, positionResolver);
        }

        const constantsNode = defineNode.getFirstOpenBracket(':constants');
        if (constantsNode) {
            const constantsText = constantsNode.getNestedNonCommentText();
            domainInfo.setConstants(PddlInheritanceParser.toTypeObjects(PddlInheritanceParser.parseInheritance(constantsText)));
        }

        const predicatesNode = defineNode.getFirstOpenBracket(':predicates');
        if (predicatesNode) {
            const predicates = new VariablesParser(predicatesNode, positionResolver).getVariables();
            domainInfo.setPredicates(predicates, predicatesNode);
        }

        const functionsNode = defineNode.getFirstOpenBracket(':functions');
        if (functionsNode) {
            const functions = new VariablesParser(functionsNode, positionResolver).getVariables();
            domainInfo.setFunctions(functions, functionsNode);
        }

        domainInfo.setDerived(PddlDomainParser.parseDerived(defineNode, positionResolver));

        const instantActions = this.parseActionProcessOrEvent(defineNode, positionResolver, "action");
        const durativeActions = this.parseDurativeActions(defineNode, positionResolver);
        domainInfo.setActions(instantActions.concat(durativeActions));

        const processes = this.parseActionProcessOrEvent(defineNode, positionResolver, "process");
        const events = this.parseActionProcessOrEvent(defineNode, positionResolver, "event");
        domainInfo.setProcesses(processes);
        domainInfo.setEvents(events);

        const constraintsNode = defineNode.getFirstOpenBracket(':constraints');
        if (constraintsNode) {
            const constraints = new PddlConstraintsParser().parseConstraints(constraintsNode);
            domainInfo.setConstraints(constraints);
        }
    }

    static parseRequirements(defineNode: PddlSyntaxNode, fileInfo: FileInfo): void {
        const requirementsNode = defineNode.getFirstOpenBracket(':requirements');
        if (requirementsNode) {
            const requirements = requirementsNode.getNonWhitespaceChildren()
                .filter(node => node.getToken().type === PddlTokenType.Keyword)
                .map(node => node.getToken().tokenText.toLowerCase());
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

    parseDurativeActions(defineNode: PddlSyntaxNode, positionResolver: DocumentPositionResolver): DurativeAction[] {
        return defineNode.getChildrenOfType(PddlTokenType.OpenBracketOperator, /\(\s*:durative-action$/)
            .map(actionNode => new DurativeActionParser(actionNode, positionResolver).getAction());
    }
}
