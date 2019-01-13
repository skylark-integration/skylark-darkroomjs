/**
 * skylark-ui-imager - The skylark imager widget
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylarkui/skylark-ui-imager/
 * @license MIT
 */
define(["skylark-langx/langx","skylark-utils/noder","skylark-utils/query","skylark-utils-canvas2d","../Imager"],function(t,a,e,i,r){"use strict";var n=r.Transformation.inherit({applyTransformation:function(t,a,e){var i=(a.getAngle()+this.options.angle)%360;a.rotate(i);var r,n;n=Math.abs(a.getWidth()*Math.sin(i*Math.PI/180))+Math.abs(a.getHeight()*Math.cos(i*Math.PI/180)),r=Math.abs(a.getHeight()*Math.sin(i*Math.PI/180))+Math.abs(a.getWidth()*Math.cos(i*Math.PI/180)),t.setWidth(r),t.setHeight(n),t.centerObject(a),a.setCoords(),t.renderAll(),e()}}),s=r.Plugin.inherit({init:function(t,a){this.overrided(t,a);var e=this.imager.toolbar.createButtonGroup(),i=e.createButton({image:"rotate-left"}),r=e.createButton({image:"rotate-right"});i.addEventListener("click",this.rotateLeft.bind(this)),r.addEventListener("click",this.rotateRight.bind(this))},rotateLeft:function(){this.rotate(-90)},rotateRight:function(){this.rotate(90)},rotate:function(t){this.imager.applyTransformation(new n({angle:t}))}}),o={name:"rotate",ctor:s};return r.installPlugin(o),o});
//# sourceMappingURL=../sourcemaps/plugins/rotate.js.map
