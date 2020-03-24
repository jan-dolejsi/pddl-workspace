/* --------------------------------------------------------------------------------------------
* Copyright (c) Jan Dolejsi. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.
* ------------------------------------------------------------------------------------------ */

import { TypeObjectMap } from "./DomainInfo";
import { DirectionalGraph } from "./utils/DirectionalGraph";
import { Util } from "./utils/util";

export function getTypesInheritingFromPlusSelf(type: string, typeInheritance: DirectionalGraph): string[] {
    return [type].concat(typeInheritance.getSubtreePointingTo(type));
}

function getObjectsOfType(allObjects: TypeObjectMap, type: string): string[] {
    const thisTypeObjects = allObjects.getTypeCaseInsensitive(type);
    return thisTypeObjects ? thisTypeObjects.getObjects() : [];
}

export function getObjectsInheritingFrom(allObjects: TypeObjectMap, type: string, typeInheritance: DirectionalGraph): string[] {
    const subTypes = getTypesInheritingFromPlusSelf(type, typeInheritance);
    const subTypesObjects = subTypes.map(subType => getObjectsOfType(allObjects, subType));
    return Util.flatMap<string>(subTypesObjects);
}
