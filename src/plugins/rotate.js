define([
  "skylark-langx/langx",
  "skylark-utils/noder",
  "skylark-utils/query",
  "skylark-utils-canvas2d",
  '../Imager',
],function(langx,noder, $, canvas2d,Imager) {
  'use strict';

var Rotation = Imager.Transformation.inherit({

  applyTransformation: function(canvas, image, next) {
    var angle = (image.getAngle() + this.options.angle) % 360;
    image.rotate(angle);

    var width, height;
    height = Math.abs(image.getWidth()*(Math.sin(angle*Math.PI/180)))+Math.abs(image.getHeight()*(Math.cos(angle*Math.PI/180)));
    width = Math.abs(image.getHeight()*(Math.sin(angle*Math.PI/180)))+Math.abs(image.getWidth()*(Math.cos(angle*Math.PI/180)));

    canvas.setWidth(width);
    canvas.setHeight(height);

    canvas.centerObject(image);
    image.setCoords();
    canvas.renderAll();

    next();
  }
});


  var RotatePlugin = Imager.Plugin.inherit({
    init: function(imager,options) {
      this.overrided(imager,options);
      var buttonGroup = this.imager.toolbar.createButtonGroup();

      var leftButton = buttonGroup.createButton({
        image: 'rotate-left'
      });

      var rightButton = buttonGroup.createButton({
        image: 'rotate-right'
      });

      leftButton.addEventListener('click', this.rotateLeft.bind(this));
      rightButton.addEventListener('click', this.rotateRight.bind(this));
    },

    rotateLeft: function() {
      this.rotate(-90);
    },

    rotateRight: function() {
      this.rotate(90);
    },

    rotate: function rotate(angle) {
      this.imager.applyTransformation(
        new Rotation({angle: angle})
      );
    }
  });

  var pluginInfo = {
    name : "rotate",
    ctor : RotatePlugin
  };

  Imager.installPlugin(pluginInfo);

  return pluginInfo;

});
