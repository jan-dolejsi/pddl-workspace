/* --------------------------------------------------------------------------------------------
* Copyright (c) Jan Dolejsi. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.
* ------------------------------------------------------------------------------------------ */

import { DocumentPositionResolver, PddlRange } from "../DocumentPositionResolver";
import { DomainInfo } from "../DomainInfo";
import { PddlBracketNode } from "../parser";

/** Syntax injector pushes code injections to the `domainInfo`. */
export interface SyntaxInjector {
    process(domainInfo: DomainInfo, positionResolver: DocumentPositionResolver): void;
}

export abstract class BaseSyntaxInjector implements SyntaxInjector {

    abstract process(domainInfo: DomainInfo, positionResolver: DocumentPositionResolver): void;

    /**
     * Resolves the relative position within/around the `referenceNode`
     * @param referenceNode syntax tree node around which the code should be injected
     * @param positionResolver document position resolver
     * @param options relative position around the reference node
     * @returns offset in the document
     */
    protected getOffset(referenceNode: PddlBracketNode | undefined, positionResolver: DocumentPositionResolver, options: { position: InjectionPosition }): number {
        if (referenceNode) {
            switch (options.position) {
                case InjectionPosition.OutsideStart: { 
                    const range = positionResolver.nodeToRange(referenceNode);
                    const relativePosition = RelativePosition.Before;
                    return this.getOffsetRelativeTo(range, relativePosition, positionResolver);
                }
                case InjectionPosition.InsideStart: {
                    const range = new PddlRange({
                        start: positionResolver.resolveToPosition(referenceNode.getStart()),
                        end: positionResolver.resolveToPosition(referenceNode.getToken().getEnd()),
                    })
                    const relativePosition = RelativePosition.After;
                    return this.getOffsetRelativeTo(range, relativePosition, positionResolver);
                }
                case InjectionPosition.InsideEnd: {
                    const endPosition = positionResolver.resolveToPosition(referenceNode.getEnd() - 1);
                    const range = PddlRange.createSingleCharacterRange(endPosition);
                    const relativePosition = RelativePosition.Before;
                    return this.getOffsetRelativeTo(range, relativePosition, positionResolver);
                }
                case InjectionPosition.OutsideEnd: {
                    const range = positionResolver.nodeToRange(referenceNode);
                    const relativePosition = RelativePosition.After;
                    return this.getOffsetRelativeTo(range, relativePosition, positionResolver);
                }
                default:
                    throw new Error('Unexpected position: ' + options.position);
            }
        }
        return -1;
    }

    private getOffsetRelativeTo(range: PddlRange, relativePosition: RelativePosition, positionResolver: DocumentPositionResolver): number {
        switch (relativePosition) {
            case RelativePosition.Before:
                return positionResolver.resolveToOffset(range.start);
            case RelativePosition.After:
                return positionResolver.resolveToOffset(range.end);
            default:
                throw new Error('Unexpected relative position: ' + relativePosition);
        }
    }
}

export enum InjectionPosition {
    /** Insert in front of the reference node */
    OutsideStart,
    /** Insert inside the reference token - just after the opening token, e.g. after `:types` */
    InsideStart,
    /** Insert in front of the closing bracket. */
    InsideEnd,
    /** Insert after the closing bracket of the reference ndoe. */
    OutsideEnd,
}

export enum RelativePosition {
    Before,
    After,
}

/** Ordered list of syntax injectors. They are processed in the order of insertion into this list. */
export class SyntaxInjectors {

    constructor(private readonly injectors: SyntaxInjector[] = []) {

    }

    process(domainInfo: DomainInfo, positionResolver: DocumentPositionResolver) {
        this.injectors.forEach(i => i.process(domainInfo, positionResolver));
    }

    add(injector: SyntaxInjector): void {
        this.injectors.push(injector);
    }
}
