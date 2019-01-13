define([
  "skylark-langx/langx",
  "skylark-utils/noder",
  "skylark-utils/query",
  "skylark-utils-canvas2d",
  '../Imager',
],function(langx,noder, $, canvas2d,Imager) {
  'use strict';

  var HistoryPlugin= Imager.Plugin.inherit({
     undoTransformations: null,

     init : function(imager,options) {
      this.overrided(imager,options);
      this.undoTransformations = [];
      this._initButtons();

      this.imager.addEventListener('core:transformation', this._onTranformationApplied.bind(this));
    },

    undo: function() {
      if (this.imager.transformations.length === 0) {
        return;
      }

      var lastTransformation = this.imager.transformations.pop();
      this.undoTransformations.unshift(lastTransformation);

      this.imager.reinitializeImage();
      this._updateButtons();
    },

    redo: function() {
      if (this.undoTransformations.length === 0) {
        return;
      }

      var cancelTransformation = this.undoTransformations.shift();
      this.imager.transformations.push(cancelTransformation);

      this.imager.reinitializeImage();
      this._updateButtons();
    },

    _initButtons: function() {
      var buttonGroup = this.imager.toolbar.createButtonGroup();

      this.backButton = buttonGroup.createButton({
        image: 'undo',
        disabled: true
      });

      this.forwardButton = buttonGroup.createButton({
        image: 'redo',
        disabled: true
      });

      this.backButton.addEventListener('click', this.undo.bind(this));
      this.forwardButton.addEventListener('click', this.redo.bind(this));

      return this;
    },

    _updateButtons: function() {
      this.backButton.disable((this.imager.transformations.length === 0))
      this.forwardButton.disable((this.undoTransformations.length === 0))
    },

    _onTranformationApplied: function() {
      this.undoTransformations = [];
      this._updateButtons();
    }
  });

  var pluginInfo = {
    name : "history",
    ctor : HistoryPlugin
  };

  Imager.installPlugin(pluginInfo);

  return pluginInfo;

  
});
