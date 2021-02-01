/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { URI } from "vscode-uri";

/**
 * An extension context is a collection of utilities private to an
 * extension.
 */
export interface PddlExtensionContext {

	/**
	 * The absolute file path of the directory containing the extension.
	 */
	readonly extensionPath: string;

	/** Keeps python location (if python extension is installed) */
	pythonPath(): string;

	/**
	 * Get the absolute path of a resource contained in the extension.
	 *
	 * @param relativePath A relative path to a resource contained in the extension.
	 * @return The absolute path of the resource.
	 */
	asAbsolutePath(relativePath: string): string;

	/**
	 * An absolute file path of a workspace specific directory in which the extension
	 * can store private state. The directory might not exist on disk and creation is
	 * up to the extension. However, the parent directory is guaranteed to be existent.
	 * @deprecated use [`storageUri`](#PddlExtensionContext.storageUri)
	 */
	readonly storagePath: string | undefined;

	/**
	 * The uri of a workspace specific directory in which the extension
	 * can store private state. The directory might not exist and creation is
	 * up to the extension. However, the parent directory is guaranteed to be existent.
	 * The value is `undefined` when no workspace nor folder has been opened.
	 */
	readonly storageUri: URI | undefined;

	subscriptions: { dispose(): unknown }[];
}
