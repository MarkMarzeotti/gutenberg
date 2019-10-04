/**
 * WordPress dependencies
 */
import { createElement } from '@wordpress/element';

/**
 * Internal dependencies
 */

import { toTree } from './to-tree';

/**
 * Create an HTML string from a Rich Text value. If a `multilineTag` is
 * provided, text separated by a line separator will be wrapped in it.
 *
 * @param {Object} $1                      Named argements.
 * @param {Object} $1.value                Rich text value.
 * @param {string} $1.multilineTag         Multiline tag.
 * @param {Array}  $1.multilineWrapperTags Tags where lines can be found if
 *                                         nesting is possible.
 *
 * @return {string} HTML string.
 */
export function toElement( {
	value,
	multilineTag,
	multilineWrapperTags,
	prepareEditableTree,
	placeholder,
} ) {
	if ( prepareEditableTree ) {
		value = {
			...value,
			formats: prepareEditableTree( value ),
		};
	}

	const tree = toTree( {
		value,
		multilineTag,
		multilineWrapperTags,
		createEmpty,
		append,
		getLastChild,
		getParent,
		isText,
		getText,
		remove,
		appendText,
		isEditableTree: true,
		placeholder,
	} );

	return <>{ createChildrenHTML( tree.children ) }</>;
}

function createEmpty() {
	return {};
}

function getLastChild( { children } ) {
	return children && children[ children.length - 1 ];
}

function append( parent, object ) {
	if ( typeof object === 'string' ) {
		object = { text: object };
	}

	object.parent = parent;
	parent.children = parent.children || [];
	parent.children.push( object );
	return object;
}

function appendText( object, text ) {
	object.text += text;
}

function getParent( { parent } ) {
	return parent;
}

function isText( { text } ) {
	return typeof text === 'string';
}

function getText( { text } ) {
	return text;
}

function remove( object ) {
	const index = object.parent.children.indexOf( object );

	if ( index !== -1 ) {
		object.parent.children.splice( index, 1 );
	}

	return object;
}

function createElementHTML( { type, attributes, object, children }, index ) {
	attributes = { ...attributes, key: index };

	if ( 'contentEditable' in attributes ) {
		attributes.suppressContentEditableWarning = true;
	}

	if ( object ) {
		return createElement( type, attributes );
	}

	return createElement( type, attributes, createChildrenHTML( children ) );
}

function createChildrenHTML( children = [] ) {
	return children.map( ( child, index ) => {
		return child.text === undefined ? createElementHTML( child, index ) : child.text;
	} );
}