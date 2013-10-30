  // Initial Setup
  // -------------

  // Save a reference to the global object (`window` in the browser, `exports`
  // on the server).
  var root = this;

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;

  // Create local references to array methods we'll want to use later.
  var array = [];
  var push = array.push;
  var slice = array.slice;
  var splice = array.splice;

  // The top-level namespace. All public Backbone classes and modules will
  // be attached to this. Exported for both the browser and the server.

  // RAM - Setting this to register as __XBase__ since it is not a clean
  // copy of Backbone anymore, so we need to avoid conflicts
  var Backbone;
  if (typeof exports !== 'undefined') {
    Backbone = exports;
  } else {
    Backbone = root.__XBase__ = {};
  }

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '1.1.0';

  // Require Underscore, if we're on the server, and it's not already present.
  var _ = root._;
  if (!_ && (typeof require !== 'undefined')) _ = require('underscore');
  
  var $x = root.$x;
  // RAM - Adding XUtil as a pre-req so I don't need duplicate 'extend' methods
  if (!$x && (typeof require !== 'undefined')) $x = require('XUtil');

  var mvvm = root.XMVVM;
  // RAM - Adding XUtil as a pre-req so I don't need duplicate 'extend' methods
  if (!mvvm && (typeof require !== 'undefined')) mvvm = require('XMVVM');  
  
// For Backbone's purposes, jQuery, Zepto, Ender, or My Library (kidding) owns
  // the `$` variable.
  Backbone.$ = root.jQuery || root.Zepto || root.ender || root.$;

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.

// RAM - Not necessary since it won't be using the Backbone name

//  Backbone.noConflict = function() {
//    root.Backbone = previousBackbone;
//    return this;
//  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PATCH"`, `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  Backbone.emulateJSON = false;


  // Helpers
  // -------

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  
//  RAM - Replacing the built in Backbone extend with the enhanced one
var extend = $x.extendClass

//  var extend = function(protoProps, staticProps) {
//    var parent = this;
//    var child;
//
//    // The constructor function for the new subclass is either defined by you
//    // (the "constructor" property in your `extend` definition), or defaulted
//    // by us to simply call the parent's constructor.
//    if (protoProps && _.has(protoProps, 'constructor')) {
//      child = protoProps.constructor;
//    } else {
//      child = function(){ return parent.apply(this, arguments); };
//    }
//
//    // Add static properties to the constructor function, if supplied.
//    _.extend(child, parent, staticProps);
//
//    // Set the prototype chain to inherit from `parent`, without calling
//    // `parent`'s constructor function.
//    var Surrogate = function(){ this.constructor = child; };
//    Surrogate.prototype = parent.prototype;
//    child.prototype = new Surrogate;
//
//    // Add prototype properties (instance properties) to the subclass,
//    // if supplied.
//    if (protoProps) _.extend(child.prototype, protoProps);
//
//    // Set a convenience property in case the parent's prototype is needed
//    // later.
//    child.__super__ = parent.prototype;
//
//    return child;
//  };

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

  // Wrap an optional error callback with a fallback error event.
  var wrapError = function(model, options) {
    var error = options.error;
    options.error = function(resp) {
      if (error) error(model, resp, options);
      model.trigger('error', model, resp, options);
    };
  };