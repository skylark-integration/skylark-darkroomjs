define([
  "skylark-langx/langx",
  "skylark-domx-noder",
  "skylark-domx-query",
  "skylark-fabric",
  '../Darkroom',
],function(langx,noder, $, fabric,Darkroom) {
  'use strict';

  var HistoryPlugin= Darkroom.Plugin.inherit({
     undoTransformations: null,

     init : function(Darkroom,options) {
      this.overrided(Darkroom,options);
      this.undoTransformations = [];
      this._initButtons();

      this.Darkroom.addEventListener('core:transformation', this._onTranformationApplied.bind(this));
    },

    undo: function() {
      if (this.Darkroom.transformations.length === 0) {
        return;
      }

      var lastTransformation = this.Darkroom.transformations.pop();
      this.undoTransformations.unshift(lastTransformation);

      this.Darkroom.reinitializeImage();
      this._updateButtons();
    },

    redo: function() {
      if (this.undoTransformations.length === 0) {
        return;
      }

      var cancelTransformation = this.undoTransformations.shift();
      this.Darkroom.transformations.push(cancelTransformation);

      this.Darkroom.reinitializeImage();
      this._updateButtons();
    },

    _initButtons: function() {
      var buttonGroup = this.Darkroom.toolbar.createButtonGroup();

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
      this.backButton.disable((this.Darkroom.transformations.length === 0))
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

  Darkroom.installPlugin(pluginInfo);

  return pluginInfo;

  
});
