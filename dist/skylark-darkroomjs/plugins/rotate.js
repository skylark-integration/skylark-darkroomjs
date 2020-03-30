/**
 * skylark-darkroomjs - A version of darkroomjs that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-darkroomjs/
 * @license MIT
 */
define(["skylark-langx/langx","skylark-domx-noder","skylark-domx-query","skylark-fabric","../Darkroom"],function(t,a,e,r,i){"use strict";var n=i.Transformation.inherit({applyTransformation:function(t,a,e){var r,i,n=(a.angle+this.options.angle)%360;a.rotate(n),i=Math.abs(a.getScaledWidth()*Math.sin(n*Math.PI/180))+Math.abs(a.getScaledHeight()*Math.cos(n*Math.PI/180)),r=Math.abs(a.getScaledHeight()*Math.sin(n*Math.PI/180))+Math.abs(a.getScaledWidth()*Math.cos(n*Math.PI/180)),t.setWidth(r),t.setHeight(i),t.centerObject(a),a.setCoords(),t.renderAll(),e()}}),o={name:"rotate",ctor:i.Plugin.inherit({init:function(t,a){this.overrided(t,a);var e=this.Darkroom.toolbar.createButtonGroup(),r=e.createButton({image:"rotate-left"}),i=e.createButton({image:"rotate-right"});r.addEventListener("click",this.rotateLeft.bind(this)),i.addEventListener("click",this.rotateRight.bind(this))},rotateLeft:function(){this.rotate(-90)},rotateRight:function(){this.rotate(90)},rotate:function(t){this.Darkroom.applyTransformation(new n({angle:t}))}})};return i.installPlugin(o),o});
//# sourceMappingURL=../sourcemaps/plugins/rotate.js.map
