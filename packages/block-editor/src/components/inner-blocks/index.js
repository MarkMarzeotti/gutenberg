/**
 * External dependencies
 */
import { pick, isEqual } from 'lodash';
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { withViewportMatch } from '@wordpress/viewport'; // Temporary click-through disable on desktop.
import { Component } from '@wordpress/element';
import { withSelect, withDispatch } from '@wordpress/data';
import { synchronizeBlocksWithTemplate, withBlockContentContext } from '@wordpress/blocks';
import isShallowEqual from '@wordpress/is-shallow-equal';
import { compose } from '@wordpress/compose';

/**
 * Internal dependencies
 */
import ButtonBlockAppender from './button-block-appender';
import DefaultBlockAppender from './default-block-appender';

/**
 * Internal dependencies
 */
import BlockList from '../block-list';
import { withBlockEditContext } from '../block-edit/context';
import TemplatePicker from './template-picker';

class InnerBlocks extends Component {
	constructor() {
		super( ...arguments );
		this.state = {
			templateInProcess: !! this.props.template,
		};
		this.updateNestedSettings();
	}

	componentDidMount() {
		const { templateLock, block } = this.props;
		const { innerBlocks } = block;
		// Only synchronize innerBlocks with template if innerBlocks are empty or a locking all exists directly on the block.
		if ( innerBlocks.length === 0 || templateLock === 'all' ) {
			this.synchronizeBlocksWithTemplate();
		}

		if ( this.state.templateInProcess ) {
			this.setState( {
				templateInProcess: false,
			} );
		}
	}

	componentDidUpdate( prevProps ) {
		const { template, block, templateLock } = this.props;
		const { innerBlocks } = block;

		this.updateNestedSettings();
		// Only synchronize innerBlocks with template if innerBlocks are empty or a locking all exists directly on the block.
		if ( innerBlocks.length === 0 || templateLock === 'all' ) {
			const hasTemplateChanged = ! isEqual( template, prevProps.template );
			if ( hasTemplateChanged ) {
				this.synchronizeBlocksWithTemplate();
			}
		}
	}

	/**
	 * Called on mount or when a mismatch exists between the templates and
	 * inner blocks, synchronizes inner blocks with the template, replacing
	 * current blocks.
	 */
	synchronizeBlocksWithTemplate() {
		const { template, block, replaceInnerBlocks } = this.props;
		const { innerBlocks } = block;

		// Synchronize with templates. If the next set differs, replace.
		const nextBlocks = synchronizeBlocksWithTemplate( innerBlocks, template );
		if ( ! isEqual( nextBlocks, innerBlocks	) ) {
			replaceInnerBlocks( nextBlocks );
		}
	}

	updateNestedSettings() {
		const {
			blockListSettings,
			allowedBlocks,
			updateNestedSettings,
			templateLock,
			parentLock,
		} = this.props;

		const newSettings = {
			allowedBlocks,
			templateLock: templateLock === undefined ? parentLock : templateLock,
		};

		if ( ! isShallowEqual( blockListSettings, newSettings ) ) {
			updateNestedSettings( newSettings );
		}
	}

	render() {
		const {
			isSmallScreen, // Temporary click-through disable on desktop.
			clientId,
			hasOverlay,
			renderAppender,
			template,
			__experimentalMoverDirection: moverDirection,
			__experimentalTemplateOptions: templateOptions,
			__experimentalOnSelectTemplateOption: onSelectTemplateOption,
			__experimentalAllowTemplateOptionSkip: allowTemplateOptionSkip,
		} = this.props;
		const { templateInProcess } = this.state;

		const isPlaceholder = template === null && !! templateOptions;

		const classes = classnames( 'editor-inner-blocks block-editor-inner-blocks', {
			'has-overlay': isSmallScreen && ( hasOverlay && ! isPlaceholder ), // Temporary click-through disable on desktop.
		} );

		return (
			<div className={ classes }>
				{ ! templateInProcess && (
					isPlaceholder ?
						<TemplatePicker
							options={ templateOptions }
							onSelect={ onSelectTemplateOption }
							allowSkip={ allowTemplateOptionSkip }
						/> :
						<BlockList
							rootClientId={ clientId }
							renderAppender={ renderAppender }
							__experimentalMoverDirection={ moverDirection }
						/>
				) }
			</div>
		);
	}
}

InnerBlocks = compose( [
	withViewportMatch( { isSmallScreen: '< medium' } ), // Temporary click-through disable on desktop.
	withBlockEditContext( ( context ) => pick( context, [ 'clientId' ] ) ),
	withSelect( ( select, ownProps ) => {
		const {
			isBlockSelected,
			hasSelectedInnerBlock,
			getBlock,
			getBlockListSettings,
			getBlockRootClientId,
			getTemplateLock,
		} = select( 'core/block-editor' );
		const { clientId } = ownProps;
		const block = getBlock( clientId );
		const rootClientId = getBlockRootClientId( clientId );

		return {
			block,
			blockListSettings: getBlockListSettings( clientId ),
			hasOverlay: block.name !== 'core/template' && ! isBlockSelected( clientId ) && ! hasSelectedInnerBlock( clientId, true ),
			parentLock: getTemplateLock( rootClientId ),
		};
	} ),
	withDispatch( ( dispatch, ownProps ) => {
		const {
			replaceInnerBlocks,
			updateBlockListSettings,
		} = dispatch( 'core/block-editor' );
		const { block, clientId, templateInsertUpdatesSelection = true } = ownProps;

		return {
			replaceInnerBlocks( blocks ) {
				replaceInnerBlocks( clientId, blocks, block.innerBlocks.length === 0 && templateInsertUpdatesSelection );
			},
			updateNestedSettings( settings ) {
				dispatch( updateBlockListSettings( clientId, settings ) );
			},
		};
	} ),
] )( InnerBlocks );

// Expose default appender placeholders as components.
InnerBlocks.DefaultBlockAppender = DefaultBlockAppender;
InnerBlocks.ButtonBlockAppender = ButtonBlockAppender;

InnerBlocks.Content = withBlockContentContext(
	( { BlockContent } ) => <BlockContent />
);

/**
 * @see https://github.com/WordPress/gutenberg/blob/master/packages/block-editor/src/components/inner-blocks/README.md
 */
export default InnerBlocks;
