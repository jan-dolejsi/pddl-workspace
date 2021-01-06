/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { HappeningType } from '../';

/** Plan happening (instantaneous action or start/end snap action) generated in the process of the plan search. */
export interface SearchHappening {
    earliestTime: number;
    actionName: string;
    shotCounter: number;
    iterations: number;
    kind: HappeningType;
    isRelaxed: boolean;
}
