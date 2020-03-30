/**
 * skylark-darkroomjs - A version of darkroomjs that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-darkroomjs/
 * @license MIT
 */
define(["skylark-langx/langx","skylark-domx-noder","skylark-domx-query","skylark-fabric","../Darkroom"],function(t,n,i,o,r){"use strict";var s={name:"history",ctor:r.Plugin.inherit({undoTransformations:null,init:function(t,n){this.overrided(t,n),this.undoTransformations=[],this._initButtons(),this.Darkroom.addEventListener("core:transformation",this._onTranformationApplied.bind(this))},undo:function(){if(0!==this.Darkroom.transformations.length){var t=this.Darkroom.transformations.pop();this.undoTransformations.unshift(t),this.Darkroom.reinitializeImage(),this._updateButtons()}},redo:function(){if(0!==this.undoTransformations.length){var t=this.undoTransformations.shift();this.Darkroom.transformations.push(t),this.Darkroom.reinitializeImage(),this._updateButtons()}},_initButtons:function(){var t=this.Darkroom.toolbar.createButtonGroup();return this.backButton=t.createButton({image:"undo",disabled:!0}),this.forwardButton=t.createButton({image:"redo",disabled:!0}),this.backButton.addEventListener("click",this.undo.bind(this)),this.forwardButton.addEventListener("click",this.redo.bind(this)),this},_updateButtons:function(){this.backButton.disable(0===this.Darkroom.transformations.length),this.forwardButton.disable(0===this.undoTransformations.length)},_onTranformationApplied:function(){this.undoTransformations=[],this._updateButtons()}})};return r.installPlugin(s),s});
//# sourceMappingURL=../sourcemaps/plugins/history.js.map
