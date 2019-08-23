/**
 * skylark-darkroomjs - A version of darkroomjs that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-darkroomjs/
 * @license MIT
 */
define(["skylark-langx/langx","skylark-utils-dom/noder","skylark-utils-dom/query","skylark-graphics-canvas2d","../Imager"],function(t,a,e,i,r){"use strict";var n=r.Transformation.inherit({applyTransformation:function(t,a,e){var i,r,n=(a.getAngle()+this.options.angle)%360;a.rotate(n),r=Math.abs(a.getWidth()*Math.sin(n*Math.PI/180))+Math.abs(a.getHeight()*Math.cos(n*Math.PI/180)),i=Math.abs(a.getHeight()*Math.sin(n*Math.PI/180))+Math.abs(a.getWidth()*Math.cos(n*Math.PI/180)),t.setWidth(i),t.setHeight(r),t.centerObject(a),a.setCoords(),t.renderAll(),e()}}),o={name:"rotate",ctor:r.Plugin.inherit({init:function(t,a){this.overrided(t,a);var e=this.imager.toolbar.createButtonGroup(),i=e.createButton({image:"rotate-left"}),r=e.createButton({image:"rotate-right"});i.addEventListener("click",this.rotateLeft.bind(this)),r.addEventListener("click",this.rotateRight.bind(this))},rotateLeft:function(){this.rotate(-90)},rotateRight:function(){this.rotate(90)},rotate:function(t){this.imager.applyTransformation(new n({angle:t}))}})};return r.installPlugin(o),o});
//# sourceMappingURL=../sourcemaps/plugins/rotate.js.map
