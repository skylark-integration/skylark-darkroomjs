/**
 * skylark-darkroomjs - A version of darkroomjs that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-darkroomjs/
 * @license MIT
 */
define(["skylark-langx/langx","skylark-utils-dom/noder","skylark-utils-dom/query","skylark-graphics-canvas2d","../Imager"],function(t,i,n,s,a){"use strict";var o={name:"history",ctor:a.Plugin.inherit({undoTransformations:null,init:function(t,i){this.overrided(t,i),this.undoTransformations=[],this._initButtons(),this.imager.addEventListener("core:transformation",this._onTranformationApplied.bind(this))},undo:function(){if(0!==this.imager.transformations.length){var t=this.imager.transformations.pop();this.undoTransformations.unshift(t),this.imager.reinitializeImage(),this._updateButtons()}},redo:function(){if(0!==this.undoTransformations.length){var t=this.undoTransformations.shift();this.imager.transformations.push(t),this.imager.reinitializeImage(),this._updateButtons()}},_initButtons:function(){var t=this.imager.toolbar.createButtonGroup();return this.backButton=t.createButton({image:"undo",disabled:!0}),this.forwardButton=t.createButton({image:"redo",disabled:!0}),this.backButton.addEventListener("click",this.undo.bind(this)),this.forwardButton.addEventListener("click",this.redo.bind(this)),this},_updateButtons:function(){this.backButton.disable(0===this.imager.transformations.length),this.forwardButton.disable(0===this.undoTransformations.length)},_onTranformationApplied:function(){this.undoTransformations=[],this._updateButtons()}})};return a.installPlugin(o),o});
//# sourceMappingURL=../sourcemaps/plugins/history.js.map
