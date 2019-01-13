/**
 * skylark-ui-imager - The skylark imager widget
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylarkui/skylark-ui-imager/
 * @license MIT
 */
define(["skylark-langx/langx","skylark-utils/noder","skylark-utils/query","skylark-utils-canvas2d","../Imager"],function(t,i,e,a,s){"use strict";var n=s.Plugin.inherit({defaults:{callback:function(){this.imager.selfDestroy()}},init:function(t,i){this.overrided(t,i);var e=this.imager.toolbar.createButtonGroup();this.destroyButton=e.createButton({image:"save"}),this.destroyButton.addEventListener("click",this.options.callback.bind(this))}}),r={name:"save",ctor:n};return s.installPlugin(r),r});
//# sourceMappingURL=../sourcemaps/plugins/save.js.map
