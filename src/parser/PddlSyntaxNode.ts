/* --------------------------------------------------------------------------------------------
* Copyright (c) Jan Dolejsi. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.
* ------------------------------------------------------------------------------------------ */

import { PddlToken, PddlTokenType, TextRange, isOpenBracket } from "./PddlTokenizer";

/** Single node in the syntax tree that wraps one PDDL tokenizer token. */
export class PddlSyntaxNode extends TextRange {
    private children = new Array<PddlSyntaxNode>();

    private maxChildEnd: number;

    /**
     * Creates the syntax tree node.
     * @param token pddl token wrapped by this node
     * @param parent parent node, unless this is the root node
     */
    constructor(private token: PddlToken, private parent?: PddlSyntaxNode) {
        super();
        this.maxChildEnd = token.getEnd();
    }

    static createRoot(): PddlSyntaxNode {
        return new PddlSyntaxNode(new PddlToken(PddlTokenType.Document, '', 0), undefined);
    }

    isRoot(): boolean {
        return this.parent === undefined;
    }

    getParent(): PddlSyntaxNode | undefined {
        return this.parent;
    }

    isLeaveBracket(): boolean {
        return this.getNestedChildren().every(child => child.isNotType(PddlTokenType.OpenBracket));
    }

    getToken(): PddlToken {
        return this.token;
    }

    addChild(childNode: PddlSyntaxNode): void {
        this.children.push(childNode);
        this.recalculateEnd(childNode);
    }

    recalculateEnd(childNode: TextRange): void {
        this.maxChildEnd = Math.max(this.maxChildEnd, childNode.getEnd());
        if (this.parent) { this.parent.recalculateEnd(this); }
    }

    getChildren(): PddlSyntaxNode[] {
        return this.children;
    }

    getNestedChildren(): PddlSyntaxNode[] {
        return this.getChildren();
    }

    getSingleChild(): PddlSyntaxNode {
        if (this.getNestedChildren().length !== 1) {
            throw new Error(`Failed assertion that node '${this.getText()}' has a single child.`);
        }
        return this.getNestedChildren()[0];
    }

    getNonWhitespaceChildren(): PddlSyntaxNode[] {
        return this.getNestedChildren().filter(c => c.getToken().type !== PddlTokenType.Whitespace);
    }

    getNonWhitespaceNonCommentChildren(): PddlSyntaxNode[] {
        return this.getNonWhitespaceChildren().filter(c => c.getToken().type !== PddlTokenType.Comment);
    }

    getSingleNonWhitespaceChild(): PddlSyntaxNode {
        const nonWhitespaceChildren = this.getNonWhitespaceChildren();
        if (nonWhitespaceChildren.length !== 1) {
            throw new Error(`Failed assertion that node '${this.toString()}' has a single non-whitespace child.`);
        }
        return nonWhitespaceChildren[0];
    }

    getChildrenOfType(type: PddlTokenType, pattern: RegExp): PddlSyntaxNode[] {
        return this.children.filter(c => c.getToken().type === type)
            .filter(node => node.getToken().tokenText.match(pattern));
    }

    getFirstChild(type: PddlTokenType, pattern: RegExp): PddlSyntaxNode | undefined {
        return this.children.filter(c => c.getToken().type === type)
            .find(node => node.getToken().tokenText.match(pattern));
    }

    getFirstChildOrThrow(type: PddlTokenType, pattern: RegExp): PddlSyntaxNode {
        const matchingChild = this.getFirstChild(type, pattern);

        if (!matchingChild) {
            throw new Error(`No child element of type ${type} satisfying pattern ${pattern.source}.`);
        }

        return matchingChild;
    }

    getFirstOpenBracket(keyword: string): PddlBracketNode {
        return this.getFirstChild(PddlTokenType.OpenBracketOperator, new RegExp('\\(\\s*' + keyword + '$', 'i')) as PddlBracketNode;
    }

    getFirstOpenBracketOrThrow(keyword: string): PddlBracketNode {
        const matchingNode = this.getFirstOpenBracket(keyword);

        if (!matchingNode) {
            throw new Error(`No child '${keyword}' open bracket.`);
        }

        return matchingNode;
    }

    getChildrenRecursively(test: (node: PddlSyntaxNode) => boolean, callback: (node: PddlSyntaxNode) => void): void {
        this.getNestedChildren().forEach(child => {
            try {
                if (test(child)) { callback(child); }
            }
            catch (_e) {
                // swallow
            }
            finally {
                child.getChildrenRecursively(test, callback);
            }
        });
    }

    /**
     * Finds the bracket nested inside the `:keyword`.
     * @param keyword keyword name e.g. 'precondition' to match ':precondition (*)' 
     */
    getKeywordOpenBracket(keyword: string): PddlBracketNode | undefined {
        const keywordNode = this.getFirstChild(PddlTokenType.Keyword, new RegExp(":" + keyword + "$", "i"));

        if (!keywordNode) {
            return undefined;
        }

        const bracket = keywordNode.getNonWhitespaceChildren().find(child => isOpenBracket(child.getToken()));

        if (bracket) {
            return bracket as PddlBracketNode;
        }
        else {
            return undefined;
        }
    }

    hasChildren(): boolean {
        return this.getNestedChildren().length > 0;
    }

    getNestedText(): string {
        let nestedText = '';
        this.getNestedChildren()
            .forEach(node => { nestedText = nestedText + node.getText(); });
        return nestedText;
    }

    getNestedNonCommentText(): string {
        let nestedText = '';
        this.getNestedChildren()
            .filter(node => node.isNotType(PddlTokenType.Comment))
            .forEach(node => { nestedText = nestedText + node.getNonCommentText(); });
        return nestedText;
    }

    getText(): string {
        return this.getToken().tokenText + this.getNestedText();
    }

    getNonCommentText(): string {
        if (this.isNotType(PddlTokenType.Comment)) {
            return this.getToken().tokenText + this.getNestedNonCommentText();
        }
        else {
            return '';
        }
    }

    getStart(): number {
        return this.token.getStart();
    }

    getEnd(): number {
        return this.maxChildEnd;
    }

    findAncestor(type: PddlTokenType, pattern: RegExp): PddlSyntaxNode | undefined {
        let parent = this.parent;

        while (parent && parent.isNotType(PddlTokenType.Document)) {
            if (parent.isType(type) && pattern.test(parent.getToken().tokenText)) {
                return parent;
            }
            parent = parent.parent;
        }

        return undefined;
    }

    findParametrisableScope(parameterName: string): PddlSyntaxNode | undefined {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let node: PddlSyntaxNode | undefined = this;
        while (!node.isDocument()) {
            node = PddlSyntaxNode.findParametrisableAncestor(node);
            if (!node) { return this.getParent(); }
            else if (node.declaresParameter(parameterName)) {
                return node;
            }
        }

        return undefined;
    }

    findAllParametrisableScopes(): PddlSyntaxNode[] {
        const scopes: PddlSyntaxNode[] = [];
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let node: PddlSyntaxNode | undefined = this;
        while (node && !node.isDocument()) {
            node = PddlSyntaxNode.findParametrisableAncestor(node);
            if (node) {
                scopes.push(node);
            }
        }
        return scopes;
    }

    private static findParametrisableAncestor(node: PddlSyntaxNode): PddlSyntaxNode | undefined {
        return node.findAncestor(PddlTokenType.OpenBracketOperator, /^\(\s*(:action|:durative-action|:process|:event|:derived|forall|sumall|exists)$/);
    }

    getParameterDefinition(): PddlSyntaxNode | undefined {
        if (this.getToken().tokenText.match(/:action|:durative-action|:process|:event/)) {
            // this node is expected to have a :parameters keyword
            return this.getKeywordOpenBracket('parameters');
        }
        else {
            // this node is expected to have parameters defined inside parentheses
            const nonWhitespaceChildren = this.getNonWhitespaceChildren();
            if (nonWhitespaceChildren.length === 0) { return undefined; }
            const firstChild = nonWhitespaceChildren[0];
            if (!isOpenBracket(firstChild.getToken())) { return undefined; }
            return firstChild;
        }
    }

    /**
     * Checks whether this scope node defines given parameter.
     * @param parameterName parameter name without the `?` sign
     */
    declaresParameter(parameterName: string): boolean {
        const parametersNode = this.getParameterDefinition();
        const parameterDefinition = parametersNode && parametersNode.getNestedText();

        const pattern = new RegExp("\\?" + parameterName + "\\b");
        return (parameterDefinition!==undefined) && pattern.test(parameterDefinition);
    }

    expand(): PddlSyntaxNode {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let node: PddlSyntaxNode = this;
        while (node && !isOpenBracket(node.getToken()) && !node.isDocument()) {
            const parentNode = node.getParent();
            if (parentNode !== undefined) {
                node = parentNode;
            }
            else {
                break;
            }
        }

        return node;
    }

    getPrecedingSiblings(type: PddlTokenType, centralNode?: PddlSyntaxNode): PddlSyntaxNode[] {
        const siblings = this.getSiblings(type, /.*/);
        const centralNodeStart = (centralNode ?? this).getStart();
        const precedingSiblings = siblings.filter(sibling => sibling.getStart() < centralNodeStart);
        return precedingSiblings;
    }

    getFollowingSiblings(type: PddlTokenType, centralNode?: PddlSyntaxNode): PddlSyntaxNode[] {
        const siblings = this.getSiblings(type, /.*/);
        const centralNodeStart = (centralNode ?? this).getStart();
        const followingSiblings = siblings.filter(sibling => sibling.getStart() > centralNodeStart);
        return followingSiblings;
    }

    private getSiblings(type: PddlTokenType, pattern: RegExp): PddlSyntaxNode[] {
        if (this.isRoot()) { return []; }
        return this.getParent()?.getChildrenOfType(type, pattern) ?? [];
    }

    isDocument(): boolean {
        return this.isType(PddlTokenType.Document);
    }

    isType(type: PddlTokenType): boolean {
        return this.getToken().type === type;
    }

    isNotType(type: PddlTokenType): boolean {
        return this.getToken().type !== type;
    }

    toString(): string {
        return `${this.token.type}: text: '${this.token.tokenText.split(/\r?\n/).join('\\n')}', range: ${this.getStart()}~${this.getEnd()}}`;
    }
}

/** Specialized tree node for open/close bracket pair. */
export class PddlBracketNode extends PddlSyntaxNode {
    private closeToken: PddlToken | undefined;
    private _isClosed = false;

    /**
     * Sets the bracket close token.
     * @param token pddl bracket close token
     */
    setCloseBracket(token: PddlToken): void {
        this._isClosed = true;
        this.closeToken = token;
        this.addChild(new PddlSyntaxNode(token));
        this.recalculateEnd(token);
    }

    getCloseBracket(): PddlToken | undefined {
        return this.closeToken;
    }

    public get isClosed(): boolean {
        return this._isClosed;
    }

    getNestedChildren(): PddlSyntaxNode[] {
        return this.getChildren()
            .filter(child => child.getToken() !== this.closeToken);
    }

    getText(): string {
        return super.getText() + (this.closeToken?.tokenText ?? '');
    }

    getNonCommentText(): string {
        return super.getNonCommentText() + (this.closeToken?.tokenText ?? '');
    }
}
