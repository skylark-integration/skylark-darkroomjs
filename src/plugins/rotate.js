define([
  "skylark-langx/langx",
  "skylark-domx-noder",
  "skylark-domx-query",
  "skylark-fabric",
  '../Darkroom',
],function(langx,noder, $, fabric,Darkroom) {
  'use strict';

var Rotation = Darkroom.Transformation.inherit({

  applyTransformation: function(canvas, image, next) {
    var angle = (image.angle + this.options.angle) % 360;
    image.rotate(angle);

    var width, height;
    height = Math.abs(image.getScaledWidth()*(Math.sin(angle*Math.PI/180)))+Math.abs(image.getScaledHeight()*(Math.cos(angle*Math.PI/180)));
    width = Math.abs(image.getScaledHeight()*(Math.sin(angle*Math.PI/180)))+Math.abs(image.getScaledWidth()*(Math.cos(angle*Math.PI/180)));

    canvas.setWidth(width);
    canvas.setHeight(height);

    canvas.centerObject(image);
    image.setCoords();
    canvas.renderAll();

    next();
  }
});


  var RotatePlugin = Darkroom.Plugin.inherit({
    init: function(Darkroom,options) {
      this.overrided(Darkroom,options);
      var buttonGroup = this.Darkroom.toolbar.createButtonGroup();

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
      this.Darkroom.applyTransformation(
        new Rotation({angle: angle})
      );
    }
  });

  var pluginInfo = {
    name : "rotate",
    ctor : RotatePlugin
  };

  Darkroom.installPlugin(pluginInfo);

  return pluginInfo;

});
