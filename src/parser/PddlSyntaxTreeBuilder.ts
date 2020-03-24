/* --------------------------------------------------------------------------------------------
* Copyright (c) Jan Dolejsi. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.
* ------------------------------------------------------------------------------------------ */

import { PddlTokenizer, PddlToken, PddlTokenType, isOpenBracket } from "./PddlTokenizer";
import { PddlSyntaxTree } from "./PddlSyntaxTree";
import { PddlSyntaxNode, PddlBracketNode } from "./PddlSyntaxNode";

/** Builds a syntax tree from PDDL syntax tokens. */
export class PddlSyntaxTreeBuilder {

    /** syntax tree */
    private tree: PddlSyntaxTree;
    /** most recently added node */
    private currentLeaf: PddlSyntaxNode;
    private offendingTokens: PddlToken[] = [];

    constructor(pddlText: string, private symbolIndex?: number) {
        this.tree = new PddlSyntaxTree();
        this.currentLeaf = this.tree.getRootNode();
        // tslint:disable-next-line:no-unused-expression
        new PddlTokenizer(pddlText, token => this.onToken(token), symbolIndex);
    }

    getBreadcrumbs(symbolIndex: number | undefined): PddlToken[] {
        const breadcrumbs: PddlToken[] = [];

        let nodeAtIndex: PddlSyntaxNode | undefined =
            symbolIndex === undefined ? this.currentLeaf : this.tree.getNodeAt(symbolIndex);

        do {
            breadcrumbs.push(nodeAtIndex.getToken());
            nodeAtIndex = nodeAtIndex.getParent();
        } while (nodeAtIndex);

        return breadcrumbs.reverse();
    }

    getTree(): PddlSyntaxTree {
        return this.tree;
    }

    getOffendingTokens(): PddlToken[] {
        return this.offendingTokens;
    }

    getTreeAsString(): string {
        return this.getNodeAsString(this.tree.getRootNode());
    }

    private getNodeAsString(node: PddlSyntaxNode): string {
        const childrenAsString = node.getChildren().map(c => this.getNodeAsString(c));
        return [node.toString()].concat(childrenAsString.map(s => this.indent(s))).join('\n');
    }
    private indent(s: string): string {
        return s.split('\n').map(line => "  " + line).join('\n');
    }

    private onToken(token: PddlToken): void {
        if (this.symbolIndex && (token.getStart() > this.symbolIndex)) { return; }
        switch (token.type) {
            case PddlTokenType.Keyword:
                this.closeKeyword();
                this.addChild(token);
                break;
            case PddlTokenType.CloseBracket:
                this.closeBracket(token);
                break;
            default:
                if (this.inLeaf()) {
                    this.closeCurrentSibling();
                }
                this.addChild(token);
                break;
        }
    }

    private closeCurrentSibling(): void {
        const parent = this.currentLeaf.getParent();
        if (parent) {
            this.currentLeaf = parent && parent;
        } else {
            throw new Error("Assertion error: closing a leaf node that has no parent.");
        }
    }

    private addChild(token: PddlToken): void {
        const newChild = isOpenBracket(token) ?
            new PddlBracketNode(token, this.currentLeaf) :
            new PddlSyntaxNode(token, this.currentLeaf);
        this.currentLeaf.addChild(newChild);
        this.currentLeaf = newChild;
    }

    private isInLeafOfType(expectedTypes: PddlTokenType[]): boolean {
        const actualType = this.currentLeaf.getToken().type;
        return expectedTypes.includes(actualType);
    }

    private inLeaf(): boolean {
        return this.isInLeafOfType([PddlTokenType.Comment,
        PddlTokenType.Other,
        PddlTokenType.Parameter,
        PddlTokenType.Dash,
        PddlTokenType.Whitespace]);
    }

    private closeBracket(closeBracketToken: PddlToken): void {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const openBracketNode = this.closeSibling(token => isOpenBracket(token), _ => false);

        if (openBracketNode) {
            (openBracketNode as PddlBracketNode).setCloseBracket(closeBracketToken);
        }
        else {
            this.offendingTokens.push(closeBracketToken);
        }
    }

    private closeKeyword(): void {
        this.closeSibling(token => token.type === PddlTokenType.Keyword, token => isOpenBracket(token));
    }

    private closeSibling(isSibling: (token: PddlToken) => boolean, isParent: (token: PddlToken) => boolean): PddlSyntaxNode | undefined {
        // exit out of the other nested token(s)
        while (!isSibling(this.currentLeaf.getToken()) && !isParent(this.currentLeaf.getToken())) {
            if (this.currentLeaf.getParent() === undefined) {
                return undefined;
            } else {
                this.closeCurrentSibling();
            }
        }

        // exit out the parent token
        if (isSibling(this.currentLeaf.getToken()) && !isParent(this.currentLeaf.getToken())) {
            const sibling = this.currentLeaf;
            this.closeCurrentSibling();
            return sibling;
        }
        else {
            return undefined;
        }
    }
}