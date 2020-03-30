/**
 * skylark-darkroomjs - A version of darkroomjs that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-darkroomjs/
 * @license MIT
 */
define(["skylark-langx/langx","skylark-domx-noder","skylark-domx-query","skylark-fabric","../Darkroom"],function(t,r,a,i,o){"use strict";var e={name:"save",ctor:o.Plugin.inherit({defaults:{callback:function(){this.Darkroom.selfDestroy()}},init:function(t,r){this.overrided(t,r);var a=this.Darkroom.toolbar.createButtonGroup();this.destroyButton=a.createButton({image:"save"}),this.destroyButton.addEventListener("click",this.options.callback.bind(this))}})};return o.installPlugin(e),e});
//# sourceMappingURL=../sourcemaps/plugins/save.js.map
