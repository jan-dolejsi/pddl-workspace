/* --------------------------------------------------------------------------------------------
* Copyright (c) Jan Dolejsi. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.
* ------------------------------------------------------------------------------------------ */

import { DirectionalGraph } from "../utils/DirectionalGraph";
import { TypeObjectMap } from "../DomainInfo";

/**
 * Planning type/object inheritance parser.
 */
export class PddlInheritanceParser {
    public static readonly OBJECT = 'object';

    static parseInheritance(declarationText: string): DirectionalGraph {

        // the inheritance graph is captured as a two dimensional array, where the first index is the types themselves, the second is the parent type they inherit from (PDDL supports multiple inheritance)
        const inheritance = new DirectionalGraph();

        if (!declarationText) { return inheritance; }

        // if there are root types that do not inherit from 'object', add the 'object' inheritance.
        // it will make the following regex work
        if (!declarationText.match(/-\s+\w[\w-]*\s*$/)) {
            declarationText += ' - object';
        }

        const pattern = /(\w[\w-]*\s+)+-\s+\w[\w-]*/g;
        let match;
        while (match = pattern.exec(declarationText)) {
            // is this a group with inheritance?
            const fragments = match[0].split(/\s-/);
            const parent = fragments.length > 1 ? fragments[1].trim() : undefined;
            const children = fragments[0].trim().split(/\s+/g);

            children.forEach(childType => inheritance.addEdge(childType, parent));
        }

        // connect orphan types to the 'object' type
        const orphans = inheritance.getVertices()
            .filter(v => !inheritance.getVerticesWithEdgesFrom(v)?.length ?? 0)
            .filter(orphan => orphan !== this.OBJECT);
        orphans.forEach(orphan => inheritance.addEdge(orphan, this.OBJECT));

        return inheritance;
    }

    static toTypeObjects(graph: DirectionalGraph): TypeObjectMap {
        const typeObjectMap = new TypeObjectMap();

        graph.getVertices().forEach(obj => {
            graph.getVerticesWithEdgesFrom(obj)
                ?.forEach(type => typeObjectMap.add(type, obj));
        });

        return typeObjectMap;
    }

}