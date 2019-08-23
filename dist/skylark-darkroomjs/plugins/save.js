/**
 * skylark-darkroomjs - A version of darkroomjs that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-darkroomjs/
 * @license MIT
 */
define(["skylark-langx/langx","skylark-utils-dom/noder","skylark-utils-dom/query","skylark-graphics-canvas2d","../Imager"],function(t,i,a,e,r){"use strict";var s={name:"save",ctor:r.Plugin.inherit({defaults:{callback:function(){this.imager.selfDestroy()}},init:function(t,i){this.overrided(t,i);var a=this.imager.toolbar.createButtonGroup();this.destroyButton=a.createButton({image:"save"}),this.destroyButton.addEventListener("click",this.options.callback.bind(this))}})};return r.installPlugin(s),s});
//# sourceMappingURL=../sourcemaps/plugins/save.js.map
