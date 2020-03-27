/* eslint-disable @typescript-eslint/no-use-before-define */
/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi 2019. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { DomainInfo, DurativeAction, InstantAction, PddlDomainConstruct, UnrecognizedStructure } from "./DomainInfo";
import { Variable } from "./language";
import { PddlTokenType } from "./parser/PddlTokenizer";
import { PddlSyntaxNode } from "./parser/PddlSyntaxNode";
import { PddlRange } from "./DocumentPositionResolver";
import { ActionEffectParser, VariableEffect, Effect } from "./parser/ActionEffectParser";

export class ModelHierarchy {
    constructor(private domainInfo: DomainInfo) {

    }

    private rangeIncludesOffset(range: PddlRange, offset: number): boolean {
        return this.domainInfo.getDocumentPositionResolver()
            .rangeIncludesOffset(range, offset);
    }

    getReferenceInfo(variableInfo: Variable, startOffset: number): VariableReferenceInfo {
        const referenceNode = this.domainInfo.syntaxTree.getNodeAt(startOffset);

        const domainActionFound = this.domainInfo.getStructures()
            .find(domainAction => this.rangeIncludesOffset(domainAction.getLocation(), startOffset));

        // todo: support constraints
        // let constraintFound = this.domainInfo.getConstraints()
        //     .find(c => c.node.includesIndex(startOffset));

        if (domainActionFound) {
            if (domainActionFound instanceof DurativeAction) {
                const durativeAction = domainActionFound as DurativeAction;

                // is it referenced by the duration?
                if (durativeAction.duration?.includesIndex(startOffset)) {
                    return this.getReadOnlyReferenceInfo(referenceNode, variableInfo, durativeAction, "duration");
                }
                // read by a condition?
                else if (durativeAction.condition?.includesIndex(startOffset)) {
                    const timeQualifierNode = ModelHierarchy.findConditionTimeQualifier(referenceNode);
                    return this.getConditionReferenceInfo(referenceNode, variableInfo, durativeAction, timeQualifierNode);
                }
                // accessed by an effect?
                else if (durativeAction.effect?.includesIndex(startOffset)) {
                    const timeQualifierNode = ModelHierarchy.findConditionTimeQualifier(referenceNode);
                    return this.getEffectReferenceInfo(referenceNode, variableInfo, durativeAction, timeQualifierNode);
                }
                else {
                    return new VariableReferenceInfo(durativeAction, undefined, "", VariableReferenceKind.UNRECOGNIZED, referenceNode, referenceNode.expand().getText());
                }
            } else if (domainActionFound instanceof InstantAction) {
                const instantAction = domainActionFound as InstantAction;

                // read by a condition?
                if (instantAction.preCondition?.includesIndex(startOffset)) {
                    return this.getConditionReferenceInfo(referenceNode, variableInfo, instantAction, undefined);
                }
                // accessed by an effect?
                else if (instantAction.effect?.includesIndex(startOffset)) {
                    return this.getEffectReferenceInfo(referenceNode, variableInfo, instantAction);
                }
                else {
                    return new VariableReferenceInfo(instantAction, undefined, "", VariableReferenceKind.UNRECOGNIZED, referenceNode, "");
                }
            } else {
                throw new Error("Unexpected action type.");
            }
        }
        // else if (constraintFound) {
        // todo: support for constraint
        // }
        else {
            const range = this.domainInfo.getDocumentPositionResolver().nodeToRange(referenceNode);
            return new UnrecognizedVariableReferenceInfo(referenceNode, range);
        }
    }

    private getConditionReferenceInfo(referenceNode: PddlSyntaxNode, _variableInfo: Variable, structure: PddlDomainConstruct, timeQualifierNode?: PddlSyntaxNode): VariableReferenceInfo {
        return this.getReadOnlyReferenceInfo(referenceNode, _variableInfo, structure, "condition", timeQualifierNode);
    }

    private getReadOnlyReferenceInfo(referenceNode: PddlSyntaxNode, _variableInfo: Variable, structure: PddlDomainConstruct, part: string, timeQualifierNode?: PddlSyntaxNode): VariableReferenceInfo {
        let conditionNode = referenceNode;
        while (!['(=', '(>', '(<', '(>=', '(<=', '(not'].includes(conditionNode.getToken().tokenText)) {
            const parentNode = conditionNode.getParent() ?? conditionNode;

            if (parentNode === timeQualifierNode ||
                parentNode.isType(PddlTokenType.Keyword) ||
                parentNode.isDocument() ||
                ['(and', '(at start', '(at end', '(over all'].includes(parentNode.getToken().tokenText.toLowerCase())) {
                break;
            }

            conditionNode = parentNode;
        }

        return new VariableReferenceInfo(structure, timeQualifierNode, part, VariableReferenceKind.READ, referenceNode, conditionNode.getText());
    }

    private getEffectReferenceInfo(referenceNode: PddlSyntaxNode, variableInfo: Variable, structure: PddlDomainConstruct, timeQualifierNode?: PddlSyntaxNode): VariableReferenceInfo {
        let effectNode = referenceNode;
        while (!['(increase', '(decrease', '(scale-up', '(scale-down', '(assign', '(not'].includes(effectNode.getToken().tokenText)) {
            const parentNode = effectNode.getParent() ?? effectNode;

            if (parentNode === timeQualifierNode ||
                parentNode.isType(PddlTokenType.Keyword) ||
                parentNode.isDocument() ||
                ['(and', '(at start', '(at end'].includes(parentNode.getToken().tokenText.toLowerCase())) {
                break;
            }

            effectNode = parentNode;
        }

        const effect = ActionEffectParser.parseEffect(effectNode);

        const kind = effect instanceof VariableEffect && effect.modifies(variableInfo) ?
            VariableReferenceKind.WRITE : VariableReferenceKind.READ;

        return new VariableEffectReferenceInfo(structure, timeQualifierNode, "effect", kind, effect, referenceNode, effect.toPddlString());
    }

    static isInsideCondition(currentNode: PddlSyntaxNode): boolean {
        return ModelHierarchy.findConditionAncestor(currentNode) !== undefined;
    }

    private static findConditionAncestor(currentNode: PddlSyntaxNode): PddlSyntaxNode | undefined {
        return currentNode.findAncestor(PddlTokenType.Keyword, /^\s*:condition$/i);
    }

    static isInsideDurativeActionUnqualifiedCondition(currentNode: PddlSyntaxNode): boolean {
        return ModelHierarchy.findDurativeActionAncestor(currentNode) !== undefined
            && ModelHierarchy.findConditionTimeQualifier(currentNode) === undefined;
    }

    private static findDurativeActionAncestor(currentNode: PddlSyntaxNode): PddlSyntaxNode | undefined {
        return currentNode.findAncestor(PddlTokenType.OpenBracketOperator, /^\(\s*:durative-action/i);
    }

    private static findConditionTimeQualifier(currentNode: PddlSyntaxNode): PddlSyntaxNode | undefined {
        return currentNode.findAncestor(PddlTokenType.OpenBracketOperator, /^\(\s*(at\s+start|at\s+end|over\s+all)/i);
    }

    static isInsideDurativeActionDiscreteEffect(currentNode: PddlSyntaxNode): boolean {
        return currentNode.findAncestor(PddlTokenType.OpenBracketOperator, /\(\s*:durative-action/i) !== undefined
            && currentNode.findAncestor(PddlTokenType.OpenBracketOperator, /\(\s*(at start|at end)/i) !== undefined;
    }

    static isInsideActionOrEvent(currentNode: PddlSyntaxNode): boolean {
        return currentNode.findAncestor(PddlTokenType.OpenBracketOperator, /\(\s*:(action|event)/i) !== undefined;
    }

    static isInsideEffect(currentNode: PddlSyntaxNode): boolean {
        return currentNode.findAncestor(PddlTokenType.Keyword, /^\s*:effect$/i) !== undefined;
    }

    static isInsideDurativeActionUnqualifiedEffect(currentNode: PddlSyntaxNode): boolean {
        return currentNode.findAncestor(PddlTokenType.OpenBracketOperator, /\(\s*:durative-action/i) !== undefined
            && currentNode.findAncestor(PddlTokenType.OpenBracketOperator, /\(\s*(at start|at end)/i) === undefined;
    }

    static isInsideProcess(currentNode: PddlSyntaxNode): boolean {
        return currentNode.findAncestor(PddlTokenType.OpenBracketOperator, /\(\s*:process/i) !== undefined;
    }

}

export class ReferenceInfo {
    constructor(public readonly node: PddlSyntaxNode) {

    }
}

export class VariableReferenceInfo extends ReferenceInfo {
    constructor(public readonly structure: PddlDomainConstruct,
        private timeQualifierNode: PddlSyntaxNode | undefined,
        public readonly part: string,
        public readonly kind: VariableReferenceKind,
        node: PddlSyntaxNode,
        public readonly relevantCode?: string) {
        super(node);
    }

    getTimeQualifier(): string {
        return this.timeQualifierNode?.getToken().tokenText.substr(1) ?? "";
    }

    toString(): string {
        return `Accessed by structure \`${this.structure.getNameOrEmpty()}\` *${this.getTimeQualifier()}* ${this.part}`;
    }
}

export class VariableEffectReferenceInfo extends VariableReferenceInfo {
    constructor(structure: PddlDomainConstruct,
        timeQualifierNode: PddlSyntaxNode | undefined,
        part: string,
        kind: VariableReferenceKind,
        public readonly effect: Effect,
        node: PddlSyntaxNode,
        relevantCode: string) {
        super(structure, timeQualifierNode, part, kind, node, relevantCode);
    }
}

export class UnrecognizedVariableReferenceInfo extends VariableReferenceInfo {
    constructor(node: PddlSyntaxNode, range: PddlRange) {
        super(new UnrecognizedStructure(range), undefined, "", VariableReferenceKind.UNRECOGNIZED, node);
    }
}

export enum VariableReferenceKind {
    READ,
    READ_OR_WRITE,
    WRITE,
    UNRECOGNIZED
}