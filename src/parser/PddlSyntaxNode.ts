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
        if (parent === undefined) {
            if (token.type !== PddlTokenType.Document) {
                throw new Error(`Node of type ${token.type} must have parent defined.`)
            }
        }
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

    /**
     * Get all keyword open brackets e.g. `(:action ...)`
     * @param keyword keyword name e.g. `action` to match `(:action ...)`
     */
    getKeywordOpenBrackets(keyword: string): PddlBracketNode[] {
        return this.getChildrenOfType(
            PddlTokenType.OpenBracketOperator,
            new RegExp("\\(\\s*:" + keyword + "$"))
            .map(node => node as PddlBracketNode);
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

    /** @returns number of characters in this node (including its children) */
    get length(): number {
        return this.getEnd() - this.getStart();
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

    getAncestors(includeTypes: PddlTokenType[], pattern = /.*/): PddlSyntaxNode[] {
        const ancestors: PddlSyntaxNode[] = [];
        let parent = this.parent;

        while (parent && parent.isNotType(PddlTokenType.Document)) {
            if (parent.isAnyOf(includeTypes) && pattern.test(parent.getToken().tokenText)) {
                ancestors.push(parent);
            }
            parent = parent.parent;
        }

        return ancestors;
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
        return (parameterDefinition !== undefined) && pattern.test(parameterDefinition);
    }

    /**
     * Expands to the encompassing bracket pair, unless this node is the top level Document node.
     */
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

    /**
     * Gets all preceding siblings (in order of appearance, not backwards)
     * @param type node type filter
     * @param centralNode optional node from which the siblings are split to preceding/following (by default this node is `this` node)
     */
    getPrecedingSiblings(type?: PddlTokenType, centralNode?: PddlSyntaxNode): PddlSyntaxNode[] {
        const siblings = this.getSiblings(type);
        const centralNodeStart = (centralNode ?? this).getStart();
        const precedingSiblings = siblings.filter(sibling => sibling.getStart() < centralNodeStart);
        return precedingSiblings;
    }

    /**
     * Gets all following siblings
     * @param type node type filter
     * @param centralNode optional node from which the siblings are split to preceding/following (by default this node is `this` node)
     */
    getFollowingSiblings(type?: PddlTokenType, centralNode?: PddlSyntaxNode): PddlSyntaxNode[] {
        const siblings = this.getSiblings(type);
        const centralNodeStart = (centralNode ?? this).getStart();
        const followingSiblings = siblings.filter(sibling => sibling.getStart() > centralNodeStart);
        return followingSiblings;
    }

    /**
     * Gets the just preceding sibling, or `undefined`, if none.
     * @param type node type filter
     * @param centralNode optional node from which the siblings are split to preceding/following (by default this node is `this` node)
     */
    getPrecedingSibling(type?: PddlTokenType, centralNode?: PddlSyntaxNode): PddlSyntaxNode | undefined {
        const precedingSiblings = this.getPrecedingSiblings(type, centralNode);
        if (precedingSiblings.length > 0) {
            return precedingSiblings[precedingSiblings.length - 1];
        } else {
            return undefined;
        }
    }

    /**
     * Gets the just following sibling, or `undefined`, if none.
     * @param type node type filter
     * @param centralNode optional node from which the siblings are split to preceding/following (by default this node is `this` node)
     */
    getFollowingSibling(type?: PddlTokenType, centralNode?: PddlSyntaxNode): PddlSyntaxNode | undefined {
        const followingSiblings = this.getFollowingSiblings(type, centralNode);
        if (followingSiblings.length > 0) {
            return followingSiblings[0];
        } else {
            return undefined;
        }
    }

    /**
     * Gets the siblings of this node.
     * @param type optional node type filter
     * @param centralNode optional node from which the siblings are split to preceding/following (by default this node is `this` node)
     */
    private getSiblings(type?: PddlTokenType, pattern = /.*/): PddlSyntaxNode[] {
        if (this.isRoot()) { return []; }
        if (type) {
            return this.getParent()?.getChildrenOfType(type, pattern) ?? [];
        } else {
            return this.getParent()?.getChildren()
                .filter(node => node.getToken().tokenText.match(pattern)) ?? [];
        }
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

    isAnyOf(types: PddlTokenType[]): boolean {
        return types.includes(this.getToken().type);
    }

    isNoneOf(types: PddlTokenType[]): boolean {
        return !this.isAnyOf(types);
    }

    isNumericExpression(): boolean {
        return ['(=', '(>', '(<', '(>=', '(<=', '(+', '(-', '(/', '(*'].includes(this.getToken().tokenText.replace(' ', ''));
    }

    isLogicalExpression(): boolean {
        return ['(and', '(or', '(not'].includes(this.getToken().tokenText.replace(' ', ''));
    }

    isTemporalExpression(): boolean {
        return ['(at start', '(at end', '(over all'].includes(this.getToken().tokenText.replace(/  /g, ' '));
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
        this.addChild(new PddlSyntaxNode(token, this));
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
