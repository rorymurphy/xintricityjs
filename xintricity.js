/*
Copyright (c) 2013, Rory Murphy
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
Neither the name of the Rory Murphy nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define('XUtil', ['jquery', 'underscore'], function ($, _) {
            // Also create a global in case some scripts
            // that are loaded still are looking for
            // a global even when an AMD loader is in use.
            return (root.XUtil = factory($, _, root));
        });
    } else {
        // Browser globals
        root.$x = root.XUtil = factory(root.jQuery, root._, root);
    }
}(this, function ($, _, root) {
    'use strict';
    //var root = this; //TODO: figure out a proper method to access the global root object inside this context
    
    var __$xOld;
    if(typeof($x) !== 'undefined'){ __$xOld = $x; }
    var $x = {};
    
    $x.noConflict = function(){
        if(__$xOld){
            root.$x = __$xOld;
        }else{
            delete root.$x;
        }
    }
    
    //Creates or retrieves the requested javascript namespace.
    $x.namespace = function (namespace) {
        var pieces = namespace.split('.');
        var nsIter;
        $.each(pieces, function (index, item) {
            if (index == 0) {
                nsIter = root;
            }
            if (!(item in nsIter)) {
                nsIter[item] = {};
            }
            nsIter = nsIter[item];
        });

        return nsIter;
    };

    //Provides string formatting using the "{0} is the first value in the array parameter" syntax
    $x.format = function(formatString){
        var args = arguments;
        formatString = formatString.replace(/\{(\d+)\}/ig, function(match, p1, offset, s){
            return args[parseInt(p1) + 1];
        });
        return formatString;
    };

    var slugifyRegex = new RegExp('/[^\w_]+/');
    //Converts a given string to a slug, as defined in Xintricity
    $x.slugify= function(value){
        return value.replace(slugifyRegex, '-').toLowerCase();
    };

    //Supplement the underscore.js extend with the getter/setter extend provide by
    //John Reisig at http://ejohn.org/blog/javascript-getters-and-setters/
    $x.extend = function(obj) {
        _.each(Array.prototype.slice.call(arguments, 1), function(source) {
          if (source) {
            var hasGetterSetter = typeof {}.__lookupGetter__ !== 'undefined';
            for (var i in source) {
                var g,s;
                if(hasGetterSetter){
                    g = source.__lookupGetter__(i);
                    s = source.__lookupSetter__(i);
                }
                if ( g || s ) {
                    if ( g )
                        obj.__defineGetter__(i, g);
                    if ( s )
                        obj.__defineSetter__(i, s);
                 } else
                     obj[i] = source[i];
            }
          }
        });
        return obj;
    };

    
    //Define our own extend method that uses the enhanced extend with
    //getter and setter support
    $x.extendClass = function(protoProps, staticProps) {
        var parent = this;
        var child;

        // The constructor function for the new subclass is either defined by you
        // (the "constructor" property in your `extend` definition), or defaulted
        // by us to simply call the parent's constructor.
        if (protoProps && _.has(protoProps, 'constructor')) {
            child = protoProps.constructor;
        } else {
            child = function() {
                return parent.apply(this, arguments);
            };
        }

        // Add static properties to the constructor function, if supplied.
        $x.extend(child, parent, staticProps);

        // Set the prototype chain to inherit from `parent`, without calling
        // `parent`'s constructor function.
        var Surrogate = function() {
            this.constructor = child;
        };
        Surrogate.prototype = parent.prototype;
        child.prototype = new Surrogate;

        // Add prototype properties (instance properties) to the subclass,
        // if supplied.
        if (protoProps)
            $x.extend(child.prototype, protoProps);

        // Set a convenience property in case the parent's prototype is needed
        // later.
        child.__super__ = parent.prototype;

        return child;
    };
    
    return $x;

}));


//This file is used to wrap the customized Backbone build

//(function(){

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define('XBase', ['underscore'], function (_) {
            // Also create a global in case some scripts
            // that are loaded still are looking for
            // a global even when an AMD loader is in use.
            return (root.__XBase__ = factory(root, _));
        });
    } else {
        // Browser globals
        root.__XBase__ = factory(root, _);
    }
}(this, function (root, _) {  // Initial Setup
  // -------------



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

  var Backbone;
  if (typeof exports !== 'undefined') {
    Backbone = exports;
  } else {
    Backbone = {};
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
  };  // Xintricity.Events
  // ---------------

  // This functionality builds on Backbone.js.  Some pieces have been kept
  // as-is, others modified, extended, or added.
  
  // This is a new class for Xintricity, but the modified Backbone event
  // system needs to know about it, so I moved it to be defined here
    var eid_iter = 0;
    Backbone.Event = function(options) {
        this.eid = 'e' + eid_iter;
        eid_iter++;

        var isDefaultPrevented = false;
        this.preventDefault = function() {
            isDefaultPrevented = true;
        };
        this.isDefaultPrevented = function() {
            return isDefaultPrevented;
        };

        var isBubbled = false;
        this.bubble = function(){
            isBubbled = true;
        }
        this.isBubbled = function(){
            return isBubbled;
        }
        $x.extend(this, options);
    };
    Backbone.Event.extend = $x.extendClass;
    
  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    on: function(name, callback, context, bubbled) {
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
      this._events || (this._events = {});
      var events = this._events[name] || (this._events[name] = []);
      events.push({callback: callback, context: context, bubbled: bubbled, ctx: context || this});
      return this;
    },

    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function(name, callback, context, bubbled) {
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
      var self = this;
      var once = _.once(function() {
        self.off(name, once, context, bubbled);
        callback.apply(this, arguments);
      });
      once._callback = callback;
      return this.on(name, once, context, bubbled);
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    off: function(name, callback, context, bubbled) {
      var retain, ev, events, names, i, l, j, k;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
      if (!name && !callback && !context && !bubbled) {
        this._events = {};
        return this;
      }
      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        if (events = this._events[name]) {
          this._events[name] = retain = [];
          if (callback || context || bubbled) {
            for (j = 0, k = events.length; j < k; j++) {
              ev = events[j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                  (context && context !== ev.context) ||
                  (bubbled && bubbled !== ev.bubbled)) {
                retain.push(ev);
              }
            }
          }
          if (!retain.length) delete this._events[name];
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(name) {
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) return this;
      var events = this._events[name];
      // RAM - adding a check to distinguish bubbled event listeners from
      // non-bubbled event listeners
      if(args[0] instanceof Backbone.Event && args[0].isBubbled()){
          events = _.filter(events, function(evt){ return evt.bubbled; });
      }
      var allEvents = this._events.all;
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, arguments);
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(obj, name, callback) {
      var listeningTo = this._listeningTo;
      if (!listeningTo) return this;
      var remove = !name && !callback;
      if (!callback && typeof name === 'object') callback = this;
      if (obj) (listeningTo = {})[obj._listenId] = obj;
      for (var id in listeningTo) {
        obj = listeningTo[id];
        obj.off(name, callback, this);
        if (remove || _.isEmpty(obj._events)) delete this._listeningTo[id];
      }
      return this;
    }

  };

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  var eventsApi = function(obj, action, name, rest) {
    if (!name) return true;

    // Handle event maps.
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    // Handle space separated event names.
    if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }

    return true;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
    }
  };

  var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.
  _.each(listenMethods, function(implementation, method) {
    Events[method] = function(obj, name, callback) {
      var listeningTo = this._listeningTo || (this._listeningTo = {});
      var id = obj._listenId || (obj._listenId = _.uniqueId('l'));
      listeningTo[id] = obj;
      if (!callback && typeof name === 'object') callback = this;
      obj[implementation](name, callback, this);
      return this;
    };
  });

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Allow the `Backbone` object to serve as a global event bus, for folks who
  // want global "pubsub" in a convenient place.
  _.extend(Backbone, Events);// This is a trimmed down version of Backbone.Model
// There were some areas where Xintricity makes significant
// changes away from the functionality of Backbone.  In
// those instances, I am removing the dead Backbone code from the
// base class to trim file size



  // Backbone.Model
  // --------------

  // Backbone **Models** are the basic data object in the framework --
  // frequently representing a row in a table in a database on your server.
  // A discrete chunk of data and a bunch of useful, related methods for
  // performing computations and transformations on that data.

  // Create a new model with the specified attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = function(attributes, options) {
    var attrs = attributes || {};
    options || (options = {});
    this.cid = _.uniqueId('c');
    this.attributes = {};
    if (options.collection) this.collection = options.collection;
    if (options.parse) attrs = this.parse(attrs, options) || {};
    attrs = _.defaults({}, attrs, _.result(this, 'defaults'));
    this.set(attrs, options);
    this.changed = {};
    this.initialize.apply(this, arguments);
  };

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // The value returned during the last failed validation.
    validationError: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // Proxy `Backbone.sync` by default -- but override this if you need
    // custom syncing semantics for *this* particular model.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Get the value of an attribute.
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    escape: function(attr) {
      return _.escape(this.get(attr));
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Set a hash of model attributes on the object, firing `"change"`. This is
    // the core primitive operation of a model, updating the data and notifying
    // anyone who needs to know about the change in state. The heart of the beast.
    set: function(key, val, options) {
      var attr, attrs, unset, changes, silent, changing, prev, current;
      if (key == null) return this;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options || (options = {});

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      // Extract attributes and options.
      unset           = options.unset;
      silent          = options.silent;
      changes         = [];
      changing        = this._changing;
      this._changing  = true;

      if (!changing) {
        this._previousAttributes = _.clone(this.attributes);
        this.changed = {};
      }
      current = this.attributes, prev = this._previousAttributes;

      // Check for changes of `id`.
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      // For each `set` attribute, update or delete the current value.
      for (attr in attrs) {
        val = attrs[attr];
        if (!_.isEqual(current[attr], val)) changes.push(attr);
        if (!_.isEqual(prev[attr], val)) {
          this.changed[attr] = val;
        } else {
          delete this.changed[attr];
        }
        unset ? delete current[attr] : current[attr] = val;
      }

      // Trigger all relevant attribute changes.
      if (!silent) {
        if (changes.length) this._pending = true;
        for (var i = 0, l = changes.length; i < l; i++) {
          this.trigger('change:' + changes[i], this, current[changes[i]], options);
        }
      }

      // You might be wondering why there's a `while` loop here. Changes can
      // be recursively nested within `"change"` events.
      if (changing) return this;
      if (!silent) {
        while (this._pending) {
          this._pending = false;
          this.trigger('change', this, options);
        }
      }
      this._pending = false;
      this._changing = false;
      return this;
    },

    // Remove an attribute from the model, firing `"change"`. `unset` is a noop
    // if the attribute doesn't exist.
    unset: function(attr, options) {
      return this.set(attr, void 0, _.extend({}, options, {unset: true}));
    },

    // Clear all attributes on the model, firing `"change"`.
    clear: function(options) {
      var attrs = {};
      for (var key in this.attributes) attrs[key] = void 0;
      return this.set(attrs, _.extend({}, options, {unset: true}));
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function(attr) {
      if (attr == null) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val, changed = false;
      var old = this._changing ? this._previousAttributes : this.attributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (attr == null || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overridden,
    // triggering a `"change"` event.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        if (!model.set(model.parse(resp, options), options)) return false;
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, val, options) {
      var attrs, method, xhr, attributes = this.attributes;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (key == null || typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options = _.extend({validate: true}, options);

      // If we're not waiting and attributes exist, save acts as
      // `set(attr).save(null, opts)` with validation. Otherwise, check if
      // the model will be valid when the attributes, if any, are set.
      if (attrs && !options.wait) {
        if (!this.set(attrs, options)) return false;
      } else {
        if (!this._validate(attrs, options)) return false;
      }

      // Set temporary attributes if `{wait: true}`.
      if (attrs && options.wait) {
        this.attributes = _.extend({}, attributes, attrs);
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        // Ensure attributes are restored during synchronous saves.
        model.attributes = attributes;
        var serverAttrs = model.parse(resp, options);
        if (options.wait) serverAttrs = _.extend(attrs || {}, serverAttrs);
        if (_.isObject(serverAttrs) && !model.set(serverAttrs, options)) {
          return false;
        }
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);

      method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
      if (method === 'patch') options.attrs = attrs;
      xhr = this.sync(method, this, options);

      // Restore attributes.
      if (attrs && options.wait) this.attributes = attributes;

      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      var destroy = function() {
        model.trigger('destroy', model, model.collection, options);
      };

      options.success = function(resp) {
        if (options.wait || model.isNew()) destroy();
        if (success) success(model, resp, options);
        if (!model.isNew()) model.trigger('sync', model, resp, options);
      };

      if (this.isNew()) {
        options.success();
        return false;
      }
      wrapError(this, options);

      var xhr = this.sync('delete', this, options);
      if (!options.wait) destroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base = _.result(this, 'urlRoot') || _.result(this.collection, 'url') || urlError();
      if (this.isNew()) return base;
      return base + (base.charAt(base.length - 1) === '/' ? '' : '/') + encodeURIComponent(this.id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    isNew: function() {
      return this.id == null;
    },

    // Check if the model is currently in a valid state.
    isValid: function(options) {
      return this._validate({}, _.extend(options || {}, { validate: true }));
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
    _validate: function(attrs, options) {
      if (!options.validate || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validationError = this.validate(attrs, options) || null;
      if (!error) return true;
      this.trigger('invalid', this, error, _.extend(options, {validationError: error}));
      return false;
    }

  });

  // Underscore methods that we want to implement on the Model.
  var modelMethods = ['keys', 'values', 'pairs', 'invert', 'pick', 'omit'];

  // Mix in each Underscore method as a proxy to `Model#attributes`.
  _.each(modelMethods, function(method) {
    Model.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.attributes);
      return _[method].apply(_, args);
    };
  });

  // Backbone.Collection
  // -------------------

  // If models tend to represent a single row of data, a Backbone Collection is
  // more analagous to a table full of data ... or a small slice or page of that
  // table, or a collection of rows that belong together for a particular reason
  // -- all of the messages in this particular folder, all of the documents
  // belonging to this particular author, and so on. Collections maintain
  // indexes of their models, both in order, and for lookup by `id`.

  // Create a new **Collection**, perhaps to contain a specific type of `model`.
  // If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.model) this.model = options.model;
    if (options.comparator !== void 0) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, _.extend({silent: true}, options));
  };

  // Default options for `Collection#set`.
  var setOptions = {add: true, remove: true, merge: true};
  var addOptions = {add: true, remove: false};

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(function(model){ return model.toJSON(options); });
    },

    // Proxy `Backbone.sync` by default.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Add a model, or list of models to the set.
    add: function(models, options) {
      return this.set(models, _.extend({merge: false}, options, addOptions));
    },

    // Remove a model, or a list of models from the set.
    remove: function(models, options) {
      var singular = !_.isArray(models);
      models = singular ? [models] : _.clone(models);
      options || (options = {});
      var i, l, index, model;
      for (i = 0, l = models.length; i < l; i++) {
        model = models[i] = this.get(models[i]);
        if (!model) continue;
        delete this._byId[model.id];
        delete this._byId[model.cid];
        index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;
        if (!options.silent) {
          options.index = index;
          // RAM - Changing to make all collection related events
          // fired on the collection and not on the model.
          //model.trigger('remove', model, this, options);
          this.trigger('remove', model, this, options);
        }
        this._removeReference(model);
      }
      return singular ? models[0] : models;
    },

    // Update a collection by `set`-ing a new list of models, adding new ones,
    // removing models that are no longer present, and merging models that
    // already exist in the collection, as necessary. Similar to **Model#set**,
    // the core operation for updating the data contained by the collection.
    set: function(models, options) {
      options = _.defaults({}, options, setOptions);
      if (options.parse) models = this.parse(models, options);
      var singular = !_.isArray(models);
      models = singular ? (models ? [models] : []) : _.clone(models);
      var i, l, id, model, attrs, existing, sort;
      var at = options.at;
      var targetModel = this.model;
      var sortable = this.comparator && (at == null) && options.sort !== false;
      var sortAttr = _.isString(this.comparator) ? this.comparator : null;
      var toAdd = [], toRemove = [], modelMap = {};
      var add = options.add, merge = options.merge, remove = options.remove;
      var order = !sortable && add && remove ? [] : false;

      // Turn bare objects into model references, and prevent invalid models
      // from being added.
      for (i = 0, l = models.length; i < l; i++) {
        attrs = models[i];
        if (attrs instanceof Model) {
          id = model = attrs;
        } else {
          id = attrs[targetModel.prototype.idAttribute];
        }

        // If a duplicate is found, prevent it from being added and
        // optionally merge it into the existing model.
        if (existing = this.get(id)) {
          if (remove) modelMap[existing.cid] = true;
          if (merge) {
            attrs = attrs === model ? model.attributes : attrs;
            if (options.parse) attrs = existing.parse(attrs, options);
            existing.set(attrs, options);
            if (sortable && !sort && existing.hasChanged(sortAttr)) sort = true;
          }
          models[i] = existing;

        // If this is a new, valid model, push it to the `toAdd` list.
        } else if (add) {
          model = models[i] = this._prepareModel(attrs, options);
          if (!model) continue;
          toAdd.push(model);

          // Listen to added models' events, and index models for lookup by
          // `id` and by `cid`.
          model.on('all', this._onModelEvent, this);
          this._byId[model.cid] = model;
          if (model.id != null) this._byId[model.id] = model;
        }
        if (order) order.push(existing || model);
      }

      // Remove nonexistent models if appropriate.
      if (remove) {
        for (i = 0, l = this.length; i < l; ++i) {
          if (!modelMap[(model = this.models[i]).cid]) toRemove.push(model);
        }
        if (toRemove.length) this.remove(toRemove, options);
      }

      // See if sorting is needed, update `length` and splice in new models.
      if (toAdd.length || (order && order.length)) {
        if (sortable) sort = true;
        this.length += toAdd.length;
        if (at != null) {
          for (i = 0, l = toAdd.length; i < l; i++) {
            this.models.splice(at + i, 0, toAdd[i]);
          }
        } else {
          if (order) this.models.length = 0;
          var orderedModels = order || toAdd;
          for (i = 0, l = orderedModels.length; i < l; i++) {
            this.models.push(orderedModels[i]);
          }
        }
      }

      // Silently sort the collection if appropriate.
      if (sort) this.sort({silent: true});

      // Unless silenced, it's time to fire all appropriate add/sort events.
      if (!options.silent) {
        for (i = 0, l = toAdd.length; i < l; i++) {
          // RAM - Changing to make all collection related events
          // fired on the collection and not on the model.
          //(model = toAdd[i]).trigger('add', model, this, options);
          model = toAdd[i];
          this.trigger('add', model, this, options);
        }
        if (sort || (order && order.length)) this.trigger('sort', this, options);
      }
      
      // Return the added (or merged) model (or models).
      return singular ? models[0] : models;
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any granular `add` or `remove` events. Fires `reset` when finished.
    // Useful for bulk operations and optimizations.
    reset: function(models, options) {
      options || (options = {});
      for (var i = 0, l = this.models.length; i < l; i++) {
        this._removeReference(this.models[i]);
      }
      options.previousModels = this.models;
      this._reset();
      models = this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return models;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      return this.add(model, _.extend({at: this.length}, options));
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.at(this.length - 1);
      this.remove(model, options);
      return model;
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      return this.add(model, _.extend({at: 0}, options));
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.at(0);
      this.remove(model, options);
      return model;
    },

    // Slice out a sub-array of models from the collection.
    slice: function() {
      return slice.apply(this.models, arguments);
    },

    // Get a model from the set by id.
    get: function(obj) {
      if (obj == null) return void 0;
      return this._byId[obj.id] || this._byId[obj.cid] || this._byId[obj];
    },

    // Get the model at the given index.
    at: function(index) {
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of
    // `filter`.
    where: function(attrs, first) {
      if (_.isEmpty(attrs)) return first ? void 0 : [];
      return this[first ? 'find' : 'filter'](function(model) {
        for (var key in attrs) {
          if (attrs[key] !== model.get(key)) return false;
        }
        return true;
      });
    },

    // Return the first model with matching attributes. Useful for simple cases
    // of `find`.
    findWhere: function(attrs) {
      return this.where(attrs, true);
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      if (!this.comparator) throw new Error('Cannot sort a set without a comparator');
      options || (options = {});

      // Run sort based on type of `comparator`.
      if (_.isString(this.comparator) || this.comparator.length === 1) {
        this.models = this.sortBy(this.comparator, this);
      } else {
        this.models.sort(_.bind(this.comparator, this));
      }

      if (!options.silent) this.trigger('sort', this, options);
      return this;
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      return _.invoke(this.models, 'get', attr);
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `reset: true` is passed, the response
    // data will be passed through the `reset` method instead of `set`.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var success = options.success;
      var collection = this;
      options.success = function(resp) {
        var method = options.reset ? 'reset' : 'set';
        collection[method](resp, options);
        if (success) success(collection, resp, options);
        collection.trigger('sync', collection, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      options = options ? _.clone(options) : {};
      if (!(model = this._prepareModel(model, options))) return false;
      if (!options.wait) this.add(model, options);
      var collection = this;
      var success = options.success;
      options.success = function(model, resp, options) {
        if (options.wait) collection.add(model, options);
        if (success) success(model, resp, options);
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new collection with an identical list of models as this one.
    clone: function() {
      return new this.constructor(this.models);
    },

    // Private method to reset all internal state. Called when the collection
    // is first initialized or reset.
    _reset: function() {
      this.length = 0;
      this.models = [];
      this._byId  = {};
    },

    // Prepare a hash of attributes (or other model) to be added to this
    // collection.
    _prepareModel: function(attrs, options) {
      if (attrs instanceof Model) {
        if (!attrs.collection) attrs.collection = this;
        return attrs;
      }
      options = options ? _.clone(options) : {};
      options.collection = this;
      var model = new this.model(attrs, options);
      if (!model.validationError) return model;
      this.trigger('invalid', this, model.validationError, options);
      return false;
    },

    // Internal method to sever a model's ties to a collection.
    _removeReference: function(model) {
      if (this === model.collection) delete model.collection;
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, collection, options) {
      if ((event === 'add' || event === 'remove') && collection !== this) return;
      if (event === 'destroy') this.remove(model, options);
      if (model && event === 'change:' + model.idAttribute) {
        delete this._byId[model.previous(model.idAttribute)];
        if (model.id != null) this._byId[model.id] = model;
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  // 90% of the core usefulness of Backbone Collections is actually implemented
  // right here:
  var methods = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl',
    'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select',
    'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke',
    'max', 'min', 'toArray', 'size', 'first', 'head', 'take', 'initial', 'rest',
    'tail', 'drop', 'last', 'without', 'difference', 'indexOf', 'shuffle',
    'lastIndexOf', 'isEmpty', 'chain'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  _.each(methods, function(method) {
    Collection.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.models);
      return _[method].apply(_, args);
    };
  });

  // Underscore methods that take a property name as an argument.
  var attributeMethods = ['groupBy', 'countBy', 'sortBy'];

  // Use attributes instead of properties.
  _.each(attributeMethods, function(method) {
    Collection.prototype[method] = function(value, context) {
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _[method](this.models, iterator, context);
    };
  });// Backbone.sync
  // -------------

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    _.defaults(options || (options = {}), {
      emulateHTTP: Backbone.emulateHTTP,
      emulateJSON: Backbone.emulateJSON
    });

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = _.result(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (options.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
      params.type = 'POST';
      if (options.emulateJSON) params.data._method = type;
      var beforeSend = options.beforeSend;
      options.beforeSend = function(xhr) {
        xhr.setRequestHeader('X-HTTP-Method-Override', type);
        if (beforeSend) return beforeSend.apply(this, arguments);
      };
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !options.emulateJSON) {
      params.processData = false;
    }

    // If we're sending a `PATCH` request, and we're in an old Internet Explorer
    // that still has ActiveX enabled by default, override jQuery to use that
    // for XHR instead. Remove this line when jQuery supports `PATCH` on IE8.
    if (params.type === 'PATCH' && noXhrPatch) {
      params.xhr = function() {
        return new ActiveXObject("Microsoft.XMLHTTP");
      };
    }

    // Make the request, allowing the user to override any Ajax options.
    var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
    model.trigger('request', model, xhr, options);
    return xhr;
  };

  var noXhrPatch = typeof window !== 'undefined' && !!window.ActiveXObject && !(window.XMLHttpRequest && (new XMLHttpRequest).dispatchEvent);

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch':  'PATCH',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Set the default implementation of `Backbone.ajax` to proxy through to `$`.
  // Override this if you'd like to use a different library.
  Backbone.ajax = function() {
    return Backbone.$.ajax.apply(Backbone.$, arguments);
  };

  // Backbone.Router
  // ---------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var optionalParam = /\((.*?)\)/g;
  var namedParam    = /(\(\?)?:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (_.isFunction(name)) {
        callback = name;
        name = '';
      }
      if (!callback) callback = this[name];
      var router = this;
      Backbone.history.route(route, function(fragment) {
        var args = router._extractParameters(route, fragment);
        callback && callback.apply(router, args);
        router.trigger.apply(router, ['route:' + name].concat(args));
        router.trigger('route', name, args);
        Backbone.history.trigger('route', router, name, args);
      });
      return this;
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
      return this;
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      this.routes = _.result(this, 'routes');
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this.routes[route]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(optionalParam, '(?:$1)?')
                   .replace(namedParam, function(match, optional) {
                     return optional ? match : '([^\/]+)';
                   })
                   .replace(splatParam, '(.*?)');
      return new RegExp('^' + route + '$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted decoded parameters. Empty or unmatched parameters will be
    // treated as `null` to normalize cross-browser behavior.
    _extractParameters: function(route, fragment) {
      var params = route.exec(fragment).slice(1);
      return _.map(params, function(param) {
        return param ? decodeURIComponent(param) : null;
      });
    }

  });
  
  var noXhrPatch = typeof window !== 'undefined' && !!window.ActiveXObject && !(window.XMLHttpRequest && (new XMLHttpRequest).dispatchEvent);

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch':  'PATCH',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Set the default implementation of `Backbone.ajax` to proxy through to `$`.
  // Override this if you'd like to use a different library.
  Backbone.ajax = function() {
    return Backbone.$.ajax.apply(Backbone.$, arguments);
  };  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on either
  // [pushState](http://diveintohtml5.info/history.html) and real URLs, or
  // [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
  // and URL fragments. If the browser supports neither (old IE, natch),
  // falls back to polling.
  var History = Backbone.History = function() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');

    // Ensure that `History` can be used outside of the browser.
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
  };

  // Cached regex for stripping a leading hash/slash and trailing space.
  var routeStripper = /^[#\/]|\s+$/g;

  // Cached regex for stripping leading and trailing slashes.
  var rootStripper = /^\/+|\/+$/g;

  // Cached regex for detecting MSIE.
  var isExplorer = /msie [\w.]+/;

  // Cached regex for removing a trailing slash.
  var trailingSlash = /\/$/;

  // Cached regex for stripping urls of hash and query.
  var pathStripper = /[?#].*$/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(window) {
      var match = (window || this).location.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment: function(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || !this._wantsHashChange || forcePushState) {
          fragment = this.location.pathname;
          var root = this.root.replace(trailingSlash, '');
          if (!fragment.indexOf(root)) fragment = fragment.slice(root.length);
        } else {
          fragment = this.getHash();
        }
      }
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error("Backbone.history has already been started");
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options          = _.extend({root: '/'}, this.options, options);
      this.root             = this.options.root;
      this._wantsHashChange = this.options.hashChange !== false;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.options.pushState && this.history && this.history.pushState);
      var fragment          = this.getFragment();
      var docMode           = document.documentMode;
      var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

      // Normalize root to always include a leading and trailing slash.
      this.root = ('/' + this.root + '/').replace(rootStripper, '/');

      if (oldIE && this._wantsHashChange) {
        this.iframe = Backbone.$('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        Backbone.$(window).on('popstate', this.checkUrl);
      } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
        Backbone.$(window).on('hashchange', this.checkUrl);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;
      var loc = this.location;
      var atRoot = loc.pathname.replace(/[^\/]$/, '$&/') === this.root;

      // Transition from hashChange to pushState or vice versa if both are
      // requested.
      if (this._wantsHashChange && this._wantsPushState) {

        // If we've started off with a route from a `pushState`-enabled
        // browser, but we're currently in a browser that doesn't support it...
        if (!this._hasPushState && !atRoot) {
          this.fragment = this.getFragment(null, true);
          this.location.replace(this.root + this.location.search + '#' + this.fragment);
          // Return immediately as browser will do redirect to new url
          return true;

        // Or if we've started out with a hash-based route, but we're currently
        // in a browser where it could be `pushState`-based instead...
        } else if (this._hasPushState && atRoot && loc.hash) {
          this.fragment = this.getHash().replace(routeStripper, '');
          this.history.replaceState({}, document.title, this.root + this.fragment + loc.search);
        }

      }

      if (!this.options.silent) return this.loadUrl();
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      Backbone.$(window).off('popstate', this.checkUrl).off('hashchange', this.checkUrl);
      clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();
      if (current === this.fragment && this.iframe) {
        current = this.getFragment(this.getHash(this.iframe));
      }
      if (current === this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl();
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragment) {
      fragment = this.fragment = this.getFragment(fragment);
      return _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: !!options};

      var url = this.root + (fragment = this.getFragment(fragment || ''));

      // Strip the fragment of the query and hash for matching.
      fragment = fragment.replace(pathStripper, '');

      if (this.fragment === fragment) return;
      this.fragment = fragment;

      // Don't include a trailing slash on the root.
      if (fragment === '' && url !== '/') url = url.slice(0, -1);

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._hasPushState) {
        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this._updateHash(this.location, fragment, options.replace);
        if (this.iframe && (fragment !== this.getFragment(this.getHash(this.iframe)))) {
          // Opening and closing the iframe tricks IE7 and earlier to push a
          // history entry on hash-tag change.  When replace is true, we don't
          // want this.
          if(!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, fragment, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        return this.location.assign(url);
      }
      if (options.trigger) return this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        var href = location.href.replace(/(javascript:|#).*$/, '');
        location.replace(href + '#' + fragment);
      } else {
        // Some browsers require that `hash` contains a leading #.
        location.hash = '#' + fragment;
      }
    }

  });

  // Create the default Backbone.history.
  Backbone.history = new History;
  // Backbone.Router
  // ---------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var optionalParam = /\((.*?)\)/g;
  var namedParam    = /(\(\?)?:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (_.isFunction(name)) {
        callback = name;
        name = '';
      }
      if (!callback) callback = this[name];
      var router = this;
      Backbone.history.route(route, function(fragment) {
        var args = router._extractParameters(route, fragment);
        callback && callback.apply(router, args);
        router.trigger.apply(router, ['route:' + name].concat(args));
        router.trigger('route', name, args);
        Backbone.history.trigger('route', router, name, args);
      });
      return this;
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
      return this;
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      this.routes = _.result(this, 'routes');
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this.routes[route]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(optionalParam, '(?:$1)?')
                   .replace(namedParam, function(match, optional) {
                     return optional ? match : '([^\/]+)';
                   })
                   .replace(splatParam, '(.*?)');
      return new RegExp('^' + route + '$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted decoded parameters. Empty or unmatched parameters will be
    // treated as `null` to normalize cross-browser behavior.
    _extractParameters: function(route, fragment) {
      var params = route.exec(fragment).slice(1);
      return _.map(params, function(param) {
        return param ? decodeURIComponent(param) : null;
      });
    }

  });  // Set up inheritance for the model, collection, router, view and history.
  // RAM - Removed View.extend, as Xintricity does not have a View object
  Model.extend = Collection.extend = Router.extend = History.extend = extend;

//This file is used to wrap the customized Backbone build
    return Backbone;
}));


/*
Copyright (c) 2013, Rory Murphy
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
Neither the name of the Rory Murphy nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define('XTemplate', ['jQuery', 'underscore', 'XUtil'], function ($, _, $x) {
            // Also create a global in case some scripts
            // that are loaded still are looking for
            // a global even when an AMD loader is in use.
            return ($x.template = factory($, _, $x));
        });
    } else {
        // Browser globals
        $x.template = factory(root.jQuery, root._, root.XUtil);
    }
}(this, function ($, _, $x) {
    'use strict';

    //The template manager provides functionality to easily manage numerous templates spanning multiple template engines.
    //It was inspired by ICanHaz, I liked the ease of managing templates, but I found that mustache templates
    //were not always sufficient for my needs, so I needed a template manager that could handle multiple template types.
    var templateManager = function () {
        _.bindAll(this, 'initialize', 'addTemplate');
    };

    templateManager.prototype = {
        _templates: {},
        _templateTypes: {},

        initialize: function () {
            //registerTemplateTypes();
            //if (_.size(this._templateTypes) > 0) { return; }
            //this.loadTemplates();
        },

        hasTemplate: function(name) {
            var t = this;
            var found = _.has(t._templates, name);
            if(!found){
                var item = $('#' + name);
                found = item.length > 0
                    && (undefined !== item.data('xt-template')
                        || item.is('script[type^="text/template"]'));
            }
            return found;
        },
        getTemplate: function (name) {
            registerTemplateTypes();
            var t = this, type = null, pattern, matches;
            pattern = new RegExp('^text/template-(.*)$', 'i');

            if (!_.has(t._templates, name)) {
                t.addTemplate(name);
            }

            return t._templates[name];
        },

        addTemplate: function (name, type, template) {
            registerTemplateTypes();
            if (template === undefined || template === null) {
                var elem = $('#' + name);
                if (elem.length == 0) {
                    throw "Must specify a name that corresponds to a template element or provide the template text";
                }
                if (elem.is('script[type^="text/template"]')) {
                    template = elem.html();
                } else {
                    //template = elem.clone().wrap('<p>').parent().html();
                    template = elem.html();
                }
                if (type === undefined) {
                    var type = elem.data('xt-template');
                    if (undefined === type) {
                        var ttype = elem.attr('type');
                        var regex = new RegExp('^text\/template-(.+)$');
                        var match = regex.exec(ttype);
                        if (match.length > 1) {
                            type = match[1];
                        }
                    }
                }
            }

            if (!_.has(this._templateTypes, type)) {
                throw "Unrecognized template type";
            }
            var compTmpl = this._templateTypes[type](template);
            this._templates[name] = compTmpl;
        },

        registerTemplateType: function (type, compileFunc) {
            this._templateTypes[type] = compileFunc;
        }
    };

    var registerTemplateTypes = function () {
        if (!_.has(this._templateTypes, 'underscore')) {
            this.registerTemplateType('underscore', function (tmplText) { return _.template(tmplText); });
        }
        if (!_.has(this._templateTypes, 'mustache') && typeof (Mustache) != 'undefined') {
            this.registerTemplateType('mustache', function (tmplText) { return Mustache.compile(tmplText); });
        }
        if (!_.has(this._templateTypes, 'handlebars') && typeof (Handlebars) != 'undefined') {
            this.registerTemplateType('handlebars', function (tmplText) { return Handlebars.compile(tmplText); });
        }
        if (!_.has(this._templateTypes, 'xintricity') && typeof (XMVVM) != 'undefined') {
            this.registerTemplateType('xintricity', function (el) { return XMVVM.Template.compile(el); });
        }
    }

    var tmplMgr = new templateManager();
    
    var XTemplate = function (template) {
        return tmplMgr.getTemplate(template);
    };
    XTemplate.addTemplate = function () {
        tmplMgr.addTemplate.apply(tmplMgr, arguments);
    };
    XTemplate.registerTemplateTypes = function () {
        tmplMgr.registerTemplateType.apply(tmplMgr, arguments);
    };

    //$x.template = new templateManager();
    registerTemplateTypes = _.bind(registerTemplateTypes, tmplMgr);
    //$x.template = $x.templateManager._templates;

    return XTemplate;

}));
/*
 Copyright (c) 2013, Rory Murphy
 All rights reserved.
 
 Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 
 Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 Neither the name of the Rory Murphy nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 
 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
 CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
 ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define('XMVVM-Model', ['jquery', 'underscore', 'XUtil', 'XBase'], function($, _, $x, XBase) {
            // Also create a global in case some scripts
            // that are loaded still are looking for
            // a global even when an AMD loader is in use.
            return (root.XMVVM = factory($, _, $x, XBase));
        });
    } else {
        // Browser globals
        root.XMVVM = factory($, _, $x, __XBase__);
    }
}(this, function($, _, $x, Backbone) {
    'use strict';

    var mvvm = {};
    Backbone.Model.isParentTypeOf = function(type) {
        return Backbone.Model.prototype.isPrototypeOf(type.prototype);
    };

    Backbone.Collection.isParentTypeOf = function(type) {
        return Backbone.Collection.prototype.isPrototypeOf(type.prototype);
    };

    var extend = $x.extendClass;

    var createField = function(key, options) {
        var t = this;
        createFieldInternal.call(t, key, options);
        t[key] = _.bind(t[key], t);
    };

    var createFieldInternal = function(key, options) {
        var t = this;
        //If object doesn't have fields, create a place for them to go.
        if (!t.fields) {
            t.fields = {};
        }

        if (t.fields && !_.has(this, 'fields')) {
            //If this object is getting fields beyond those in its prototype
            //Copy fields from prototype into a collection for this object
            t.fields = $x.extend({}, t.fields);
        }

        //Allow just the field type to be passed in rather than a full field definition
        if (_.isFunction(options)) {
            options = {type: options};
        }
        
        _.defaults(options, {
           persist: true,
           type: Object
        });
        options['name'] = key;
        
        t.fields[key] = options;
//        if (!_.has(this.fields, key)) {
//            t.fields[key] = options;
//        }

        t[key] = function() {
            if (arguments.length === 1) {
                this.set(key, arguments[0]);
            } else {
                return this.get(key);
            }
        };
    };

    _.mixin({
        resultBB: function(obj, property, evaluate) {
            if (evaluate === undefined) {
                evaluate = true;
            }
            var val = obj[property];
            if (undefined === val && obj instanceof Backbone.Model) {
                val = obj.get(property);
            }
            if (undefined !== val && evaluate && _.isFunction(val)) {
                val = val();
            }
            return val;
        },
        startsWith: function(val, prefix) {
            return val.substr(0, prefix.length) === prefix;
        },
        endsWith: function(val, suffix) {
            var startPos = val.length - suffix.length;
            return (startPos >= 0 && val.substr(startPos) === suffix);
        }
    });

    // Defined the Xintricity event in the modified Backbone library, but want
    // it to be part of the XMVVM object
    mvvm.Event = Backbone.Event;
    
    var collEvtMap = {
        add: ['model', 'collection', 'options'],
        remove: ['model', 'collection', 'options'],
        destroy: ['model', 'collection', 'options'],
        reset: ['collection', 'options'],
        sort: ['collection', 'options'],

        request: ['collection', 'xhr', 'options'],
        sync: ['collection', 'resp', 'options'],
        error: ['collection', 'xhr', 'options']
    };

    var modelEvtMap = {
        add: ['model', 'collection', 'options'],
        remove: ['model', 'collection', 'options'],
        destroy: ['model', 'collection', 'options'],        
        
        change: ['model', 'options'],
        'change:': ['model','value','options'],

        request: ['model', 'xhr', 'options'],
        sync: ['model', 'resp', 'options'],
        error: ['model', 'xhr', 'options'],

        invalid: ['model', 'error', 'options']

    };

    var routerEvtMap = {
        route: ['route','params'],
        'route:': ['params']
    };

    //Maps legacy Backbone events to Xintricity event objects
    var mapEvent = function(evtMap, event) {
        var reqArgCount = 2; //This will be used for certain offsets in the arguments 
        var args = Array.prototype.slice.call(arguments);
        var evt;

        var evtType = event;
        var eIdx = event.indexOf(':');

        var map=undefined;
        if(_.has(evtMap, evtType)){
            map = evtMap[evtType];
        }else if(eIdx >= 0){
             //Handle the case where it's a sub-type of event like change:property
            var eType = evtType.substr(0, eIdx + 1);
            if(_.has(evtMap, eType)){
                map = evtMap[eType];
            }
        }

        if(undefined !== map){
            var newArgs = {};
            _.each(map, function(val, idx){
               newArgs[val] = args[idx + reqArgCount]; 
            });

            evt = new mvvm.Event(newArgs);
        }
        
        return evt;
    };
    
    var trigger = function(parentType, eventAttrName, eventMap, event) {
        var reqArgCount = 4;
        var args = Array.prototype.slice.call(arguments);
        var evt;
        var evtArgs = null;
        if (arguments.length > reqArgCount
                && !(arguments[reqArgCount] instanceof mvvm.Event)) {
            //The event was triggered with legacy Backbone syntax
            var mapArgs = Array.prototype.slice.call(arguments, reqArgCount - 1);
            mapArgs.unshift(eventMap);
            evt = mapEvent.apply(this, mapArgs);
            if (undefined !== evt) {
                evtArgs = [event, evt];
            } else {
                evtArgs = Array.prototype.slice.call(arguments, reqArgCount - 1);
            }
        } else if (reqArgCount === arguments.length) {
            //Only the event name was passed in, with no arguments
            var newArgs = {};
            newArgs[eventAttrName] = this;
            evt = new mvvm.Event(newArgs);
            evtArgs = [event].concat([evt]);
            
        } else {
            //The event was triggered using Xintricity syntax
            evtArgs = Array.prototype.slice.call(arguments, reqArgCount - 1);
        }
        
        parentType.prototype.trigger.apply(this, evtArgs);
    };    
    
    mvvm.Model = Backbone.Model.extend({
        constructor: function(attributes, options) {
            var t = this;
            _.bindAll(this, 'createField', 'set');
            _.defaults(t, {
                fields: {}
            });

            //Bind the getter/setter functions for all the inherited
            //fields to the current object
            _.chain(t.fields).keys().each(function(val) {
                t[val] = _.bind(t[val], t);
            });

            Backbone.Model.apply(this, [attributes, options]);

        },
        fields: {},
        createField: function(key, options) {
            createField.call(this, key, options);
        },
        clone: function() {
            var t = this;
            var inst = new this.constructor(this.attributes);
            //For most fields, it's sufficient just to bind the getter/setters
            _.chain(inst.fields).keys().each(function(val) {
                inst[val] = _.bind(inst[val], inst);
            });

            //TODO: Decide whether a deep clone would be better
            inst.fields = $x.extend({}, t.fields);
            //If custom fields were added after the instance was created,
            //those must be re-created
            _.each(inst.fields, function(val, name, list) {
                if (!inst.constructor.prototype
                        || !inst.constructor.prototype.fields
                        || !inst.constructor.prototype.fields[name]) {
                    inst.createField(name, val);
                }
            });
            return inst;
        },
        toJSON: function() {
            var t=this;
            var atts = _.clone(t.attributes);
            _.each(atts, function(val, key){
                //If persistence is turned off for this field, ignore it
                if(_.has(t.fields, key) && ! t.fields[key].persist){return;}
                
                if(val instanceof mvvm.Model
                    || val instanceof mvvm.Collection){
                    atts[key] = val.toJSON();
                }
            });
            
            return atts;
        },
        trigger: _.partial(trigger, Backbone.Model, 'model', modelEvtMap),
        set: function(key, val, options) {
            var t = this, attrs, curr;
            var fields = t['fields'];

            if (_.isObject(key)) {
                attrs = key;
                options = val;
            } else {
                (attrs = {})[key] = val;
            }

            //Fields will be null during a clone
            //if(fields==null){Backbone.Model.prototype.set.apply(this, [key, val, options]); return;}

            var fAttrs = _.clone(attrs);
            _.each(attrs, function(value, name, list) {
                var field, valid, fVal;
                
                fVal=value;
                if (fields !== null && _.has(fields, name)) {
                    field = fields[name];
                    fVal = t._prepareValue(field, value);
                    valid = true;
                    if (_.isFunction(field.validate)) {
                        valid = field.validate(value);
                    }
                    if (valid !== true) {
                        throw valid;
                    }
                }

                curr = t[name];
                if (curr !== null && (curr instanceof Backbone.Model || curr instanceof Backbone.Collection)) {
                    curr.off('all', retrigger, this);
                }

                //If it's a model or collection, bubble the change events
                if (fVal instanceof Backbone.Model || fVal instanceof Backbone.Collection) {
                    var retrigger = function(evtName, evt) {
                        var args = Array.prototype.slice.call(arguments);
                        // Prevent cycles if two models both reference each other
                        if (_.has(evt, 'model')
                                && evt.model === t
                                || (_.has(evt, 'recipients')
                                    && _.has(evt.recipients, t.cid))
                        ) {
                            return;
                        }
                        evt.bubble();
                        evt.recipients = evt.recipients || {};
                        evt.recipients[t.cid] = true;
                        t.trigger.apply(t, args);
                    }

                    var currVal = t.get(name);
                    if (currVal) {
                        currVal.off('all', retrigger, t.cid + name);
                    }
                    fVal.on('all', retrigger, t.cid + name);
                }
                
                fAttrs[name] = fVal;
            });
            return Backbone.Model.prototype.set.apply(this, [fAttrs, options]);

        },
        _prepareValue: function(field, value) {
            if (undefined === value || null === value) {
                return value;
            }
            switch (field.type) {
                case 'int':
                    if (typeof (value) !== 'int') {
                        value = parseInt(value);
                    }
                    break;
                case Number:
                    if (!_.isNumber(value)) {
                        value = parseFloat(value);
                    }
                    break;
                case Boolean:
                    if (!_.isBoolean(value)) {
                        value = value == true;
                    }
                    break;
                case String:
                    if (!_.isString(value)) {
                        value = value + '';
                    }
                    break;
                case Date:
                    if (!(value instanceof Date)) {
                        if (_.isNumber(value)) {
                            value = new Date(value);
                        }
                        else if (_.isString(value)) {
                            value = Date.parse(value);
                        }
                    }
                    break;
                case Array:
                    if (!(value instanceof Array)) {
                        throw 'Type mismatch';
                    }
                    break;
                default:
                    if (!(value instanceof field.type)) {
                        if (((field.type === Backbone.Model || Backbone.Model.isParentTypeOf(field.type))
                                && _.isObject(value))
                                || ((field.type === Backbone.Collection || Backbone.Collection.isParentTypeOf(field.type))
                                && (_.isObject(value) || _.isArray(value)))) {
                            value = new field.type(value);
                        }else if (!(value instanceof field.type)) {
                            throw 'Type mismatch';
                        }
                    }
                    break;
            }

            return value;
        },
        parse: function(res) {
            var result = {};
            _.each(this.fields, function(elem, index, list) {
                if (Backbone.Model.isParentTypeOf(elem.type) || Backbone.Collection.isParentTypeOf(elem.type)) {
                    result[elem.name] = new elem.type(res[elem.name], {parse: true});
                }else{
                    result[elem.name] = res[elem.name];
                }
            });

            return result;
        }
    });
    mvvm.Model.extend = function(protoProps, staticProps) {
        var t = this;
        
        //fields get special treatment
        if(protoProps.fields){
            var fields = protoProps.fields;
            delete protoProps.fields;
        }
        var obj = extend.call(t, protoProps, staticProps);
        
        if(fields){ protoProps.fields = fields; }
        if (t.prototype.fields) {
            _.each(t.prototype.fields, function(val, key) {
                createFieldInternal.call(obj.prototype, key, val);
            });
        }
        if (_.has(protoProps, 'fields')) {
            _.each(protoProps.fields, function(val, key) {
                createFieldInternal.call(obj.prototype, key, val);
            });
        }
        return obj;
    };
    mvvm.Model.createField = function(obj, key, options) {
        createFieldInternal.call(obj, key, options);
    };
    mvvm.Model.defaults = {
        useGetSet: false //option to support javascript getter/setter syntax
    };

    mvvm.Collection = Backbone.Collection.extend({
        unique: function() {
            var args = array.slice.call(arguments);
            args.unshift(this.models);
            return _.unique.apply(_, args);
        },
        _onModelEvent: function(event, model, collection, options) {

            //Override default behavior and trigger list updates regardless of whether they come from this list.
            if ((event === 'add' || event === 'remove') && collection !== this) {
                this.trigger.apply(this, arguments);
            }
            else {
                Backbone.Collection.prototype._onModelEvent.apply(this, arguments);
            }
        },
        trigger: _.partial(trigger, Backbone.Collection, 'collection', collEvtMap)
    });

    mvvm.ViewModel = mvvm.Model.extend({
        view: null,
        fields: {
            model: Object
        },
        render: function() {
            var t = this;
            if (t.view) {
                t.$el = $x.template(t.view)(t.model(), {context: {viewmodel: t}});
            }
            return t.$el;
        },
        dispose: function() {
            var t=this;
            if(t.$el && t.view){
                $x.template(t.view)('destroy', t.$el);
            }
        }
    });
    //mvvm.ViewModel.extend = extend;


    var backboneGetSet = function(name, val) {
        if (arguments.length == 1) {
            return this.get(name);
        } else {
            this.set(name, val);
        }
    };

    mvvm.Filters = _.extend({}, {
       isFalse: function(val){ return val === false; }, 
       isNull: _.isNull,
       isUndefined: _.isUndefined,
       isObject: _.isObject,
       isNullOrUndefined: function(val){ return val === undefined || val === null; },
       isEmpty: function(val){ return val === undefined || val === null || val === ''; },
       isEqualTo0: function(val){ return val === 0; },
       isEqualTo1: function(val){ return val === 1;},
       isGreaterThan0: function(val){ return val > 0; },
       isLessThan0: function(val){ val < 0; },
       add1: function(val){ return val + 1; },
       subtract1: function(val){ return val - 1; }
    });
    
    mvvm.BindingExpression = function(args){
        if(args){_.extend(this, args);}
    };
    _.extend(mvvm.BindingExpression.prototype, {
        toString: function(){
            var result = '{';
            var keys = _.keys(this).sort();
            result += '"' + keys[0] + '","' + this[keys[0]] + '"';
            for(var i=1; i < keys.length; i++){
               result += ',"' + keys[i] + '","' + this[keys[i]] + '"';
            }
            result += '}';
            return result;
        }
    });
    
    mvvm.ModelNavMixins = {
        splitModelPath: function(path) {
            var matches;
            matches = path.match(/\w+(?=\.?)|(?=\[)\w+(?=\])/g)
            return matches;
        },
        resolveModelPath: function(model, path, options) {
            return this.resolveModelExpression(model, {path: path}, options);
        },
        resolveModelExpression: function(model, expression, options) {
            var path = expression.path;
            if (arguments.length < 3 || options === undefined) {
                options = {};
            }
            options = _.defaults(options, {
                evalVal: true,
                allowPartial: true
            });
            //Have to apply the default for applyFilter after evalVal
            options = _.defaults(options, {
                applyFilter: options.evalVal
            });
            
            var t = this;
            var modelLevels = [];
            var modLvl = [model];
            var oldLvl;

            if (typeof (path) === 'undefined' || path === null || path === '') {
                return undefined; //Return undefined rather than throw error
            }

            var parts;
            if (path instanceof Array) {
                parts = path;
            } else {
                parts = this.splitModelPath(path);
            }

            for (var i = 0; i < parts.length; i++) {
                var lvl = modLvl[modLvl.length - 1];

                //If part of the path can't be resolved, and the allowPartial option is true, return the piece
                //that can be resolved.  Otherwise, return undefined.
                if (lvl == null && options.allowPartial) {
                    break;
                } else if (lvl == null) {
                    modLvl = undefined;
                    break; //Return undefined rather than throw error
                }

                if (lvl instanceof Backbone.Collection) {
                    lvl = lvl.at(parts[i]);
                } else if (!lvl[parts[i]] && lvl instanceof Backbone.Model && lvl.has(parts[i])) {
                    lvl = _.bind(backboneGetSet, lvl, parts[i])
                } else {
                    //If it is a function and this is not the leaf, or if it is the leaf and the evalVal options
                    //is set, evaluate the result if it's a function
                    if (i < parts.length - 1 || options.evalVal) {
                        oldLvl = lvl;
                        lvl = _.resultBB(lvl, parts[i]);
                    } else {
                        lvl = lvl[parts[i]];
                    }
                }

                if (typeof (lvl) === 'undefined') {
                    //On a partial resolve, return the portion of the path that can be resolved if the whole path can't
                    //On a non-partial, just return null if the whole path can't be resolved.
                    if (options.allowPartial) {
                        break;
                    } else {
                        modLvl = undefined;
                        break;
                    }
                }
                modLvl.push(lvl);
            }

            var result1 = (modLvl !== undefined && modLvl !== null && modLvl.length > 0) ? _.last(modLvl) : modLvl;
            if(options.applyFilter){
                var result2 = this._applyBindExpression(expression, result1, model);
                if (result2 !== result1) {
                    modLvl.push(result2);
                }
            }
            return modLvl;
        },
        resolveModelExpressionValue: function(model, expression) {
            var t = this, val = t.resolveModelExpression(model, expression, {allowPartial: false});
            if (undefined !== val && _.isArray(val) && val.length > 0) {
                val = _.last(val);
            } else {
                val = undefined;
            }
            return val;
        },
        _applyBindExpression: function(expression, value, context) {
            var transform;
            if (_.has(expression, 'filter') && _.isString(expression.filter)) {
                context = context.clone();
                context.createField('Filter', Object);
                context.set('Filter', mvvm.Filters);
                var filter = this.resolveModelPath(context, expression.filter, {evalVal: false, allowPartial: false});
                if (!_.isArray(filter)) {
                    throw 'Invalid filter, path does not exist';
                } else {
                    filter = _.last(filter);
                }
                if (_.isFunction(filter)) {
                    value = filter(value);
                } else {
                    throw 'Invalid filter, not a function';
                }
            } else if (_.has(expression, 'pattern') && _.isString(expression.pattern)) {
                value = $x.format(expression.Pattern, value);
            }

            return value;
        },
        bindModelPath: function(model, path, callback, options) {
            this.bindModelExpression(model, {path: path}, callback, options);
        },
        bindModelExpression: function(model, expression, callback, options) {
            var t = this;
            var parts = this.splitModelPath(expression.path);
            var lvls = this.resolveModelPath(model, parts);
            var record = {model: model, expression: expression, callback: callback};

            var verifyAffectedMod = function(evt) {
                var idx = _.indexOf(lvls, evt.model);

                //If the model isn't found or it is the leaf object, then we're not affected
                if (idx < 0 || idx == parts.length) {
                    return false;
                }
                //However if the model is the first level (the base level), we always are affected
                else if (idx === 0) {
                    return true;
                }
                //Otherwise check if the appropriate property name is in the list of changed props
                else if (_.has(evt.model.changed, parts[idx])) {
                    return true;
                }

                return false;
            }

            var checkCallback = function(event, evt) {
                var args, idx, opts;

                var result = false;
                switch (event) {
                    case 'change':
                        opts = evt.options;
                        args = Array.prototype.slice.call(arguments, 1, arguments.length);
                        result = verifyAffectedMod.apply(this, args);
                        break;
                    case 'add':
                    case 'remove':

                        opts = evt.options;
                        idx = _.indexOf(lvls, evt.collection); //arguments[2] == collection
                        //True if the collection the item being monitored
                        //or if the collection is in the path being monitored, and if the path
                        //refers to this model as the direct child of the collection (it is possible that
                        //the path might refer to a different element of the collection, which in turn refers
                        //to the model m, which would not constitute being affected.
                        result = idx >= 0 && (idx === lvls.length - 1 || _.indexOf(lvls, evt.collection) === idx + 1);
                        break;
                }

                result = result && !((this instanceof Backbone.Model || this instanceof Backbone.Collection) && _.has(evt, 'recipients') && _.has(evt.recipients, this.cid));
                if (result) {
                    //Update the lvls to reflect the new chain
                    lvls = this.resolveModelPath(model, parts);
                    evt.recipients = (!_.has(evt, 'recipients')) ? {} : evt.recipients;
                    evt.recipients[this.cid] = true;
                    callback.apply(this, arguments);

                    var newEvt = new mvvm.Event();
                    newEvt.oldValue = record.value;

                    var newVal = this.resolveModelExpression(record.model, record.expression);
                    //not sure why this was here, it's redundant
                    //newVal = this._applyBindExpression(record.expression, newVal, record.model);
                    if (newVal.length === parts.length + 1) {
                        newVal = _.last(lvls);
                    } else {
                        newVal = undefined;
                    }
                    newEvt.value = newVal;
                    record.value = newVal;

                    callback.apply(this, [newEvt]);
                }
            };
            if (!_.has(this, '_bindingCallbacks')) {
                t._bindingCallbacks = [];
            }

            record.checkCallback = _.bind(checkCallback, t);
            t._bindingCallbacks.push(record);

            model.on('all', record.checkCallback, t);
        },
        unbindModelPath: function(model, path, callback) {
            this.unbindModelExpression(model, {path: path}, callback);
        },
        unbindModelExpression: function(model, expression, callback) {
            var itm = _.find(this._bindingCallbacks, function(val) {
                return val.model === model && _.isEqual(val.expression, expression) && val.callback === callback;
            });
            model.off('all', itm.checkCallback, this);
        },
        setModelPathValue: function(model, path, value, useSetter) {
            useSetter = (undefined === useSetter) ? true : useSetter;

            var split = _.isArray(path) ? path : this.splitModelPath(path);
            var lvls = this.resolveModelPath(model, split, {evalVal: false, allowPartial: false});

            var lvlLen = lvls.length;
            var last = lvls[lvlLen - 1];

            if (useSetter && _.isFunction(last)) {
                last(value);
            } else if (last instanceof Backbone.Collection) {
                lvls[lvlLen - 2].update(value);
            } else {
                lvls[lvlLen - 2][split[lvlLen - 1]] = value;
            }
        }
    };

    mvvm.Router = Backbone.Router.extend({
       initialize: function (options) {
           var t=this;
           _.bindAll(this, 'canRoute');
           options = options || {};
          _.defaults(options, {
              root: '/',
              startHistory: true,
              pushState: true
          });
          
          if(options.startHistory){
              Backbone.history.start({pushState: options.pushState, root: options.root});
          }
          
          var baseFull = location.protocol+'//'+location.hostname+(location.port ? ':'+location.port: '') + options.root;
          
          $(document).on('click', 'a:not([data-bypass])', function (evt) {

            var href = $(this).attr('href');
            var protocol = this.protocol + '//';

            if (href && href.substr(0, baseFull.length) === baseFull && $(this).attr('target') !== '_blank' && $(this).attr('rel') !== 'external') {
              var tail = href.substr(baseFull.length);
              
              var isRouted = t.canRoute(tail);
              if(isRouted){
                  evt.preventDefault(); 
                  t.navigate(tail, {trigger: true});
              }else if(tail == Backbone.history.fragment){
                  evt.preventDefault();
              }
            }
          });
        },        
        
        canRoute: function(fragment) {
          var t = this;          
          if (!Backbone.History.started) return false;
          var url = this.root + (fragment = Backbone.history.getFragment(fragment || ''));
      

          var pathStripper = /[?#].*$/;
          fragment = fragment.replace(pathStripper, '');
          
          if(fragment === Backbone.history.fragment){ return false; }
          
          fragment = Backbone.history.getFragment(fragment);
          return _.any(Backbone.history.handlers, function(handler) {
            if (handler.route.test(fragment)) {
              return true;
            }
          });
        }
    });
    return mvvm;
}));

/*
Copyright (c) 2013, Rory Murphy
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
Neither the name of the Rory Murphy nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jQuery', 'underscore', 'XUtil', 'XMVVM-Model'], function ($, _, $x, mvvm) {
            // Also create a global in case some scripts
            // that are loaded still are looking for
            // a global even when an AMD loader is in use.
            return (root.XMVVM = factory($, _, $x, mvvm, XBase));
        });
    } else {
        // Browser globals
        root.XMVVM = factory(root.jQuery, root._, root.XUtil, root.XMVVM);
    }
}(this, function ($, _, $x, mvvm) {
    'use strict';

    mvvm.NodeTypes = [];
    var templateNode = mvvm.templateNode = function(options){
        var t=this;
        options = _.defaults(options, {
           childNodes: [],
           el: null,
           $el: null,
           inner: null,
           parent: null
        });
        if(options.el && !options.$el){ options.$el = $(options.el); }
        if(!(options.$el instanceof $)){ options.$el = $(options.$el); }
        options.el = options.$el.get(0);
        _.extend(t, options);
        this.initialize();
    }
    _.extend(templateNode.prototype, {
        initialize: function(){
            _.bindAll(this, 'createInstance');
        },
        createInstance: function($el, context){
            return this.type.createInstance(this, $el, context);
        } 
    });
    
    var resolveElement = function ($el, indices) {
            var curr = $el;
            _.each(indices, function (val) {
                curr = curr.contents().eq(val);
            });

            return curr;
    }
        
    var templateParser = mvvm.templateParser = function(){
        this.initialize();
    };

    _.extend(templateParser.prototype, {
        initialize: function(){
            _.bindAll(this, 'parse', '_parse', 'calculatePosition');
            var t = this;
            t.childScopeSelector = '';
            t.parseFunctions = {};
            _.each(mvvm.NodeTypes, function(val){
               var parser = _.defaults(val, {
                   name: null,
                   type: 'bind', //types: tree, block, bind
                   selector: null,
                   parse: null,
                   render: null
                });
                if(parser.name === null || parser.name === ''){ throw "Parser must specify a name"; }
                if(parser.parse === null || !_.isFunction(parser.parse)){ throw "Must specify a valid parse function"; }
                if(parser.type === 'block' && (parser.selector == null || parser.selector == '')){ throw "If parser is a block, must specify a selector for all nested scopes."; }

                t.parseFunctions[parser.name] = _.bind(parser.parse, t);
                if(parser.type === 'block'){
                    if(t.childScopeSelector != '')
                    { t.childScopeSelector += ','; }
                    t.childScopeSelector += parser.selector;
                }

            });

            var excludeNestedScopesInner = function ($el, idx) { return $(this).parentsUntil($el, t.childScopeSelector).length > 0; };
            t.excludeNestedScopes = function($el){ return _.partial(excludeNestedScopesInner, $el); };
        },
        parse: function(el){
            var t=this;
            var innerNodes = [];
            if(typeof(t.parserFunctions) === 'undefined'){ t.initialize(); }
            var node = new templateNode({
                el: $(el),
                inner: $(el).children()
            });
            var innerNodes = innerNodes.concat(t._parse(node));
            while(innerNodes.length > 0){
                var b = innerNodes.shift();
                var n = t._parse(b);
                if(_.isArray(n) && n.length > 0){
                    innerNodes.push.apply(innerNodes, n);
                }
            }
            return node;
        },
        _parse: function(node){
            var t=this;
            var innerNodes = [];
            var nodeTypes = mvvm.NodeTypes;
            _.each(_.where(nodeTypes, {type: 'tree'}), function(val){
                innerNodes = innerNodes.concat(t.parseFunctions[val.name](node) || []);
            });

            _.each(_.where(nodeTypes, {type: 'block'}), function(val){
                innerNodes = innerNodes.concat(t.parseFunctions[val.name](node) || []);
            });

            var blocks = node.$el.find('*').not(t.childScopeSelector).not(t.excludeNestedScopes(node.$el)).add(node.$el);

            _.each(_.where(nodeTypes, {type: 'bind'}), function(val){
                blocks.each(function (idx, elem) {
                    t.parseFunctions[val.name](node, elem);
                });
            });
            
            return innerNodes;
        },

        calculatePosition: function (child, parent) {
            //If the attributes are on the logic block element itself
            if(child.get(0) === parent.get(0)){ return []; }

            child = $(child);
            parent = $(parent);

            var parents = child.parentsUntil(parent);
            if (child.closest(parent).length === 0) {
                return undefined;
            }
            var indices = [child.parent().contents().index(child)];
            parents.each(function (idx, elem) {
                var $el = $(elem);
                indices.unshift($el.parent().contents().index($el));
            });

            return indices;
        },
        parseBinding: function (modelRef, allowComplex) {
            var binding = {},
                matches,
            //Corresponds to syntax like {{model.SomeProperty}}
                basicPatt = /^\{\{([\w\.\[\]]+)\}\}$/i,
            //Corresponds to syntax like {{Path='model.SomeProperty', Transform='model.SomeFunction'}}
                advPatt = /^\{\{(?:\s*(Path|Filter|Pattern|HTML)\s*=\s*(?:'([^']*)'|"([^"]*)")\s*\,?)+\}\}$/ig,
                advPatt2 = /(Path|Filter|Pattern|HTML)\s*=\s*('[^']*'|"[^"]*")\s*/ig

            if (1 === arguments.length) {
                allowComplex = true;
            }
            matches = modelRef.match(basicPatt);
            if (matches !== null && matches.length > 1) {
                binding.path = matches[1];
            } else if (allowComplex) {
                if (advPatt.exec(modelRef) !== null) {

                    while (matches = advPatt2.exec(modelRef)) {
                        binding[matches[1].toLowerCase()] = matches[2].substring(1, matches[2].length - 1);
                    }

                    //Ensure that at least the Path was parsed from the attributes, otherwise binding is not valid
                    if (!binding.hasOwnProperty('path')) {
                        binding = undefined;
                    }
                } else {
                    binding = modelRef;
                }
            } else {
                binding = modelRef;
            }
            if(_.isObject(binding)){
                return new mvvm.BindingExpression(binding);
            }else{
                return binding;
            }
        }
    });

    var cssTriggerNodeType = mvvm.cssTriggerNodeType = {
        name: 'css-trigger',
        type: 'tree', //types: tree, block, bind
        parse: function(node){
            var t = this;
            var result = [];
            //This selector specifies that it must either be the first child
            //or preceded by another trigger - it's not perfect, you could place
            //multiple selectors and not have any be the first child, and it would
            //still pick up all but the first.
            node.$el.find('[data-xt-event][data-xt-class]:first-child, [data-xt-event]+[data-xt-event][data-xt-class], [data-xt-event][data-xt-style]:first-child, [data-xt-event]+[data-xt-event][data-xt-style]')
                    .not(t.excludeNestedScopes(node.$el))
                    .each(function(idx, elem){
                        var $el = $(elem);
                        var options = {$el: $el};
                        var styles = [];
                        if($el.is('[data-xt-style]')){
                            styles = $el.data('xt-style').split(';');
                        }
                        var cssClass = $el.data('xt-class');

                        options.event = $el.data('xt-event');
                        options.type = cssTriggerNodeType;
                        options.position = t.calculatePosition($(elem).parent(), node.$el);

                        if(styles !== undefined && styles.length > 0)
                        {
                            options.styles = {};
                            _.each(styles, function (val) {
                                var vals = val.split(':');
                                if(2 !== vals.length){return;}
                                options.styles[vals[0].trim()] = vals[1].trim(); 
                            });
                        }
                        if(cssClass !== undefined)
                        { options.cssClass = cssClass; }
                        result.push(new templateNode(options));
                    });
            node.childNodes = node.childNodes.concat(result);
            return [];
        },
        createInstance: function(node, $el, context){
            var options = {
                event: node.event,
                el: resolveElement($el, node.position),
                context: context
            };
            if(_.has(node, 'styles'))
            { options.styles = node.styles; }
            if(_.has(node, 'cssClass'))
            { options.cssClass = node.cssClass; }

            return new mvvm.StyleTrigger(options);      
        }
    };
    mvvm.NodeTypes.push(cssTriggerNodeType);

    var actionTriggerNodeType = mvvm.actionTriggerNodeType = {
        name: 'action-trigger',
        type: 'tree',
        parse: function(node){
            var t = this;
            var result = [];
            node.$el.find('[data-xt-event][data-xt-action]:first-child, [data-xt-event]+[data-xt-event][data-xt-action]')
                    .not(t.excludeNestedScopes(node.$el))
                    .each(function(idx, elem){
                        var $el = $(elem);
                        var options = {$el: $el};
                        var data = $el.data('xt-data');

                        options.event = $el.data('xt-event');
                        options.action = t.parseBinding($el.data('xt-action'), false);
                        options.type = actionTriggerNodeType;
                        options.position = t.calculatePosition($(elem).parent(), node.$el);

                        if(data !== undefined)
                        { options.data = t.parseBinding(data, false); }

                        result.push(new templateNode(options));
                        //Removing the trigger HTML node from the DOM tree
                        $el.remove();
                    });
            node.childNodes = node.childNodes.concat(result);
            return [];
        },
        createInstance: function(node, $el, context){
            var options = {
                event: node.event,
                el: resolveElement($el, node.position),
                context: context,
                action: node.action
            };
            if(_.has(node, 'data'))
            { options.data = node.data; }

            return new mvvm.ActionTrigger(options);  
        }
    };
    mvvm.NodeTypes.push(actionTriggerNodeType);

    var foreachNodeType = mvvm.foreachNodeType = {
        name: 'foreach',
        type: 'block',
        selector: '[data-xt-foreach]',
        parse: function(node){
            var t = this;
            var result = [];
            //Select all the foreach elements that aren't nested within another block
            var blocks = node.$el.find('[data-xt-foreach]').not(t.excludeNestedScopes(node.$el));
            blocks.each(function (idx, elem) {
                var $el = $(elem);
                var options = {
                    $el: $(elem),
                    type: foreachNodeType,
                    position: t.calculatePosition($el, node.$el),
                    expression: t.parseBinding($el.data('xt-foreach')),
                    iterator: $el.data('xt-iterator'),
                    indexer: $el.data('xt-index')
                };
                result.push(new templateNode(options));
            });
            node.childNodes = node.childNodes.concat(result);
            return result;
        },

        createInstance: function(node, $el, context){
            var t=this;
            var replace = resolveElement($el, node.position);
            var item = new ForeachBlockInst({
                block: node,
                context: context,
                el: replace
            });
            item.render();
            return item;
        }
    };

    mvvm.NodeTypes.push(foreachNodeType);

    var ifNodeType = mvvm.ifNodeType = {
        name: 'if-else',
        type: 'block',
        selector: '[data-xt-if],[data-xt-else-if],[data-xt-else]',
        parse: function(node){
            var t = this;
            var result = [];
            var blocks = node.$el.find('[data-xt-if]').not(t.excludeNestedScopes(node.$el));
            blocks.each(function (idx, elem) {
                var $el = $(elem);

                var block = new templateNode({
                    el: elem,
                    type: ifNodeType,
                    position: t.calculatePosition($el, node.$el),
                    branches: [],
                    defaultBranch: null
                });

                var curr = $el;

                do {
                    var cond = curr.is('[data-xt-if]')?curr.data('xt-if'):curr.data('xt-else-if');
                    var bBlock = new templateNode({
                        el: curr,
                        type: ifNodeType,
                        subType: 'branch',
                        expression: t.parseBinding(cond)
                    });
                    if (curr.is('[data-xt-onrender]')) {
                        bBlock.onrender = t.parseBinding(curr.data('xt-onrender'));
                    }
                    block.branches.push(bBlock);
                    result.push(bBlock);
                    curr = curr.next();
                }while (curr.is('[data-xt-else-if]'));

                if (curr.is('[data-xt-else]')) {
                    block.defaultBranch = new templateNode({
                        el: curr,
                        type: ifNodeType,
                        subType: 'else'
                    });
                    result.push(block.defaultBranch);
                    if (curr.is('[data-xt-onrender]')) {
                        block.defaultBranch.onrender = t.parseBinding(curr.data('xt-onrender'));
                    }
                }

                node.childNodes.push(block);
            });

            return result;
        },
        createInstance: function(node, $el, context){
            var replace = resolveElement($el, node.position);
            var item = new IfBlockInst({
                block: node,
                context: context,
                el: replace
            });
            item.render();
            return item;
        }
    };

    mvvm.NodeTypes.push(ifNodeType);


    var partialNodeType = mvvm.partialNodeType = {
        name: 'partial',
        type: 'block',
        selector: '[data-xt-partial]',
        parse: function(node){
            var t = this;
            var blocks = node.$el.find('[data-xt-partial]').not(t.excludeNestedScopes(node.$el));
            blocks.each(function (idx, elem) {
                var $el = $(elem);
                var model = $el.data('xt-model');
                if(model){ model = t.parseBinding(model); }
                var partial = $el.data('xt-partial');
                if(undefined === model){
                    var bind = t.parseBinding(partial);
                    if(_.isObject(bind)){
                        model = bind;
                        partial = undefined;
                    }
                }

                node.childNodes.push(new templateNode({
                    $el: $el,
                    type: partialNodeType,
                    position: t.calculatePosition($el, node.$el),
                    template: partial,
                    model: model
                }));
            });   
        },
        createInstance: function(node, $el, context){
            var replace = resolveElement($el, node.position);
            var item = new ChildTemplateBlockInst({
                block: node,
                context: context,
                el: replace
            });
            item.render();
            return item;
        }
    };

    mvvm.NodeTypes.push(partialNodeType);

    var attributeBindingNodeType = mvvm.attributeBindingNodeType = {
        name: 'attribute-binding',
        type: 'bind',
        parse: function(node, elem){
            var $el = $(elem);
            var t = this;

            //Handle and attribute bindings
            _.each(elem.attributes, function (attr) {
                var name = attr.name;
                //ignore attribute bindings for xintricity attributes, element ids and elements types
                //as these are not allowed. 
                if ((name.substr(0, 8) === 'data-xt-'
                        && 'data-xt-src' !== name
                        && 'data-xt-value' !== name)
                        // || name === 'id'
                        || name === 'type') { return; }

                var val = attr.value;
                val = t.parseBinding(val);
                if (_.isObject(val)) {
                    node.childNodes.push(new templateNode({
                        expression: val,
                        type: attributeBindingNodeType,
                        position: t.calculatePosition($el, node.$el),
                        attr: name
                    }));
                }
            });        
        },
        createInstance: function(node, $el, context){
            var target = resolveElement($el, node.position);
            var item = new mvvm.AttributeBinding({
                model: context,
                el: target,
                expression: node.expression,
                attr: node.attr
            });
            return item;
        }
    };

    mvvm.NodeTypes.push(attributeBindingNodeType);

    var cssBindingNodeType = mvvm.cssBindingNodeType = {
        name: 'css-binding',
        type: 'bind',
        parse: function(node, elem){
            var $el = $(elem);
            var t = this;

            var prefix = 'data-xt-class-';

            var attrs = _.filter(elem.attributes, function (a) { return _.startsWith(a.name, prefix); });
            //Handle and attribute bindings
            _.each(attrs, function (attr) {
                var name = attr.name;

                var val = attr.value;
                val = t.parseBinding(val);
                if (_.isObject(val)) {
                    node.childNodes.push(new templateNode({
                        expression: val,
                        type: cssBindingNodeType,
                        position: t.calculatePosition($el, node.$el),
                        cssClass: name.substr(prefix.length)
                    }));
                }
            });        
        },
        createInstance: function(node, $el, context){
            var target = resolveElement($el, node.position);
            var item = new mvvm.CssClassBinding({
                model: context,
                el: target,
                expression: node.expression,
                cssClass: node.cssClass
            });
            return item;
        }
    };

    mvvm.NodeTypes.push(cssBindingNodeType);

    var textBindingNodeType = mvvm.textBindingNodeType = {
        name: 'text-binding',
        type: 'bind',
        textBindingPattern: /\{\{([a-zA-Z][\w\._]*|([a-zA-z]\w*\s*=\s*('[^']*'|"[^"]*"),?\s*)+)\}\}/g,
        parse: function(node, elem){
            var t = this;
            var $el = $(elem);

            var contents = $el.contents();
            //Parse bindings for text nodes contained by the current element
            _.each(contents.filter(function () { return this.nodeType == 3; }), function (txtnode) {
                var binding = textBindingNodeType.createBinding.call(t, txtnode, node.$el, txtnode.nodeValue);
                if(binding !== null){
                    node.childNodes.push(binding);
                }
            });
            //Parse bindings for any properties that don't match attribute value binding syntax
            _.each($el.get(0).attributes, function (attr) {
                //Ignore attribute value bindings
                if(_.isObject(t.parseBinding(attr.value))){ return; }
                
                var binding = textBindingNodeType.createBinding.call(t, $el, node.$el, attr.value, attr.name);
                if (binding !== null) {
                    node.childNodes.push(binding);
                }
            });
        },
        createBinding: function(el, parent, text, attrName){
            var t = this;
            var $el = $(el);
            
            var matches = [];
            var match = null;
            while (match = textBindingNodeType.textBindingPattern.exec(text)) { matches.push(match[0]); }
            if (matches != null && matches.length > 0) {
                var patterns = _.uniq(matches);
                matches = _.map(patterns, function (val) { return t.parseBinding(val); });
                var tblock = text;
                tblock = tblock.replace(/\{/, '&#123;').replace(/\}/, '&#125;');
                var pattern = text.replace(textBindingNodeType.textBindingPattern, function (val) {
                    return '{' + _.indexOf(patterns, val) + '}';
                });

                var args = {
                    type: textBindingNodeType,
                    paths: matches,
                    pattern: pattern,
                    position: t.calculatePosition($el, parent)
                };
                if(undefined !== attrName){
                    args['attribute'] = attrName;
                };

                return new templateNode(args);
            }else{
                return null;
            }
        },
        createInstance: function(node, $el, context){
            var target = resolveElement($el, node.position);
            var args = {
                model: context,
                el: target,
                paths: node.paths,
                pattern: node.pattern
            };
            if(_.has(node, 'attribute')){ args['attribute'] = node.attribute; }
            var item = new mvvm.TextNodeBinding(args);
            return item;
        }
    };

    mvvm.NodeTypes.push(textBindingNodeType);

    var selectBindingNodeType = mvvm.selectBindingNodeType = {
        name: 'select-binding',
        type: 'bind',
        parse: function(node, elem){
            var t=this;
            var $el = $(elem);
            if(!$el.is('[data-xt-options]')){ return; }
            var val = $el.data('xt-options');
            var options = {
                el: elem,
                type: selectBindingNodeType,
                path: val.substr(2, val.length - 4),
                position: t.calculatePosition($el, node.$el)
            };

            var textField = $el.data('xt-text-field');
            var valueField = $el.data('xt-value-field');
            if (undefined !== textField && null !== textField) {
                options.textField = textField;
            }
            if (undefined !== valueField && null !== valueField) {
                options.valueField = valueField;
            }
            var binding = new templateNode(options);
            node.childNodes.push(binding);
        },
        createInstance: function(node, $el, context){
            var target = resolveElement($el, node.position);
            var item = new mvvm.SelectBinding({
                model: context,
                el: target,
                path: node.path,
                textField: node.textField,
                valueField: node.valueField
            });
            return item;
        }
    };

    mvvm.NodeTypes.push(selectBindingNodeType);

    mvvm.Binding = function () { };
    mvvm.Binding.extend = $x.extendClass;

    mvvm.AttributeBinding = mvvm.Binding.extend({
        constructor: function (options) {
            var t = this;
            this.options = $x.extend({}, options);
            this.options = _.defaults(this.options, this.defaults);

            if (t.options.model === null || t.options.path === null || t.options.el === null || t.options.attr === null) {
                throw "model, path, el, and attr options are required";
            }
            //Only value updates trigger a change event, so only those can synch to the model.
            if (t.options.attr !== 'value') {
                t.options.updateModel = false;
            }
            t.$el = $(t.options.el);
            _.bindAll(this, 'value', 'elementValue', 'setModelAttr', 'modelChanged', 'bindModel', 'unbindModel', 'bindEl', 'setElProp', 'elChanged', 'dispose');
            this.bindModel()
            this.bindEl();
            this.initialize();
        },

        initialize: function () {
            var t = this;
            if (t.options.updateElement) {
                t.setElProp(t.value());
            }
            if (t.options.updateModel) {
                this.setModelAttr(t.$el.attr(t.options.attr));
            }
        },

        defaults: {
            model: null,
            expression: null,
            el: null,
            attr: null,
            updateModel: true,
            updateElement: true
        },

        bindModel: function () {
            this._modelPath = this.resolveModelExpression(this.options.model, this.options.expression, { evalVal: false, applyFilter: false, allowPartial: false });
            this.bindModelExpression(this.options.model, this.options.expression, this.modelChanged);
        },

        unbindModel: function () {
            var t = this;
            this.unbindModelExpression(this.options.model, this.options.expression, this.modelChanged);
        },

        value: function () {
            var t = this;
            if (typeof (this._modelPath) === 'undefined' || this._modelPath.length === 0) { return; }

            var val = this._modelPath[this._modelPath.length - 1];
            if (_.isFunction(val)) {
                val = val();
            }
            
            return this._applyBindExpression(this.options.expression, val, this.options.model);
        },

        elementValue: function(){
            var t=this;
            var result;
            
            var isValue = t.options.attr === 'data-xt-value';
            if(t.$el.is('input[type="radio"]') && isValue){
                var $el = t.$el.closest('form');
                if($el.length === 0){ $el = $(document);}
                result = $el.find($x.format('input[type="radio"][name="{0}"]:checked', t.$el.attr('name'))).val();
            }else if(t.$el.is('input[type="checkbox"]') && isValue){
                result = t.$el.is(':checked') ? t.$el.val() : undefined;
            }else if(t.$el.is('select') && t.options.attr === 'value'){
                result = t.$el.val();
            }else{
                result = t.$el.attr(t.options.attr);
            }
            return result;
        },
        
        setModelAttr: function (val) {
            var t = this;
            var modLvl = t._modelPath;
            //If the model path cannot be resolved, throw an error
            if(undefined === modLvl || null === modLvl){
                throw 'Xintricity cannot set model value, expression does not exist: ' + t.options.expression.path;
            }
            var lvlCount = modLvl.length;

            var parts = this.splitModelPath(t.options.expression.path);
            //if the last level is a function, that means that the last level
            //is the value that function evaluates to.  If that is the case, call the setter,
            //which doubles as the getter.
            if (lvlCount > 0 && _.isFunction(modLvl[lvlCount - 1])) {
                modLvl[lvlCount - 1](val);
            } else {
                modLvl[lvlCount - 2][_.last(parts)] = val;
            }
        },

        modelChanged: function (event, model, options) {
            var t = this;

            this._modelPath = this.resolveModelExpression(this.options.model, this.options.expression, { evalVal: false, applyFilter: false, allowPartial: false });

            // Don't update the id attribute, regardless of the updateElement
            // flag
            if (t.options.updateElement
                && 'id' !== t.options.attr) {
                t.setElProp(t.value());
            }
        },

        bindEl: function () {
            var t = this;
            //Only the element value can be bound
            if (t.options.el.nodeType == 3) {
                throw 'Attribute binding cannot be used with text nodes';
            }

            t.$el.on('change.binding', t.elChanged);
        },

        unbindEl: function () {
            var t = this;
            t.$el.off('change.binding', t.elChanged);
            this._modelPath = null;
        },

        setElProp: function (val) {
            var t = this;
            if (t.options.updateElement) {
                if(t.$el.is('input[type="radio"]') && t.options.attr === 'data-xt-value'){
                    var $el = t.$el.closest('form');
                    if($el.length === 0){ $el = $(document);}
                    $el = $el.find($x.format('input[type="radio"][name="{0}"][value="{1}"]', t.$el.attr('name'), val));
                    $el.prop('checked', 'checked');
                }else if(t.$el.is('input[type="checkbox"]') && t.options.attr === 'data-xt-value'){
                    //Using only == to allow for type conversions since this is not getting all of Xintricity's normal
                    //type handling
                    if(val == t.$el.val()){
                        t.$el.prop('checked', 'checked');
                    }else{
                        t.$el.prop('checked', '');
                    }
                }
                else if (t.options.attr === 'value') {
                    t.$el.val(val);
                } else if('data-xt-src' == t.options.attr && t.$el.is('img')){
                    t.$el.attr('src', val)
                }else { t.$el.attr(t.options.attr, val); }
            }
        },
        elChanged: function (evt, ui) {
            this.setModelAttr(this.elementValue());
        },

        dispose: function () {
            this.unbindModel();
            this.unbindEl();
        }
    });
    $x.extend(mvvm.AttributeBinding.prototype, mvvm.ModelNavMixins);

    mvvm.TextNodeBinding = mvvm.Binding.extend({
        constructor: function (options) {
            var t = this;
            this.options = $x.extend({}, options);
            this.options = _.defaults(this.options, this.defaults);

            if (t.options.model === null || t.options.paths === null || t.options.paths.length === 0 || t.options.el === null || t.options.pattern == null) {
                throw "model, path, el, and attr options are required";
            }
            if (t.options.el instanceof $) {
                t.options.el = t.options.el.get(0);
            }
            this._modelPaths = {};
            this._callbacks = {};
            _.bindAll(this, 'initialize', 'value', 'modelChanged', 'bindModel', 'updateText', 'dispose');
            this.bindModel()
            this.initialize();
        },

        initialize: function () {
            this.updateText();
        },

        defaults: {
            model: null,
            paths: null,
            el: null,
            pattern: null
        },

        bindModel: function (path) {
            var t = this, paths;
            if (arguments.length === 1) { paths = [path]; }
            else { paths = this.options.paths; }

            _.each(paths, function (p) {
                t._callbacks[p] = _.bind(t.modelChanged, t, p);
                //t._modelPaths[p] = t.resolveModelExpression(t.options.model, p, { evalVal: false, allowPartial: false });
                t.bindModelExpression(t.options.model, p, t._callbacks[p]);
            });
        },

        value: function (path) {
            var t = this;
            var result = t.resolveModelExpression(t.options.model, path, { evalVal: true, allowPartial: false });
            return (_.isArray(result) && result.length > 0)?_.last(result):undefined;
        },

        modelChanged: function (path) {
            var t = this;
            //t.unbindModelPath(this.options.model, path, t._callbacks[path]);
            //t.options.model.off('all', null, this);

            //t.bindModel(path);
            t.updateText();
        },

        updateText: function () {
            var t = this;
            var vals = [t.options.pattern];
            var html=false;
            _.each(t.options.paths, function (p) {
                var v = t.value(p);
                if(undefined == v){ v=''; }                     
                else{ v = v.toString();}
                if(_.has(p, 'html') && p.html === 'true'){
                    vals.push(v);
                    html=true;
                }else{
                    v = v?t.escapeHtml(v):v;
                    vals.push(v);
                }
            });
            var text = $x.format.apply(this, vals).replace(/&#123;/, '{').replace(/&#125;/, '}');
            
            if(_.has(t.options, 'attribute')){
                $(t.options.el).attr(t.options.attribute, t.escapeEntities(text));
            }else if(html){
                var node = document.createElement('div');
                var $el = $(t.options.el);
                var parent = $el.parent().get(0);
                var elems = t.options.el;
                if(!(elems instanceof NodeList)){
                    elems = [t.options.el];
                }
                
                node.innerHTML = '<div>' + text + '</div>';
                node = node.children;
                _.each(node, function(val){
                   parent.insertBefore(val, elems[0]);
                });
                _.each(elems, function(val){
                    parent.removeChild(val);
                });
                //var node = $('<div>' + text + '</div>');
                //$el.replaceWith(node);
                
                //Only execute scripts if the node has already been added to the page, otherwise
                //it is up to the script executing the template to do so.
                if($(node).parents('html').length > 0){
                    //TODO: Possibly add an "unsafe" switch that user has to set if they want scripts executed.
                    $(node).filter('script').each(function(){
                        $.globalEval(this.text || this.textContent || this.innerHTML || '');
                    });                    
                }

                t.options.el = node;
            }else{
                t.options.el.nodeValue = t.escapeEntities(text);
            }
        },

        escapeHtml: function(unsafe) {
            return unsafe.replace(/&<>"/g, function(str){return mvvm.TextNodeBinding.HtmlEntities[str];});
            //return unsafe.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        },
        
        escapeEntities: function(unsafe){
            return unsafe.replace(/[^\x20-\x7E]/g, function(str){ return mvvm.TextNodeBinding.EntityCodes[str] ? '&' + mvvm.TextNodeBinding.EntityCodes[str] + ';' : str });
        },
                
        dispose: function () {
            var t = this, paths = this.options.paths;

            _.each(paths, function (p) {
                t.unbindModelExpression(t.options.model, p, t._callbacks[p]);
            });
            t._modelPaths = {};
            t._callbacks = {};
            
            delete t._callbacks;
            delete t._modelPaths;
        }
    });
    $x.extend(mvvm.TextNodeBinding.prototype, mvvm.ModelNavMixins);
    mvvm.TextNodeBinding.HtmlEntities = {
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
    };
    mvvm.TextNodeBinding.EntityCodes = {
        apos:0x0027,quot:0x0022,amp:0x0026,lt:0x003C,gt:0x003E,nbsp:0x00A0,iexcl:0x00A1,cent:0x00A2,pound:0x00A3,
        curren:0x00A4,yen:0x00A5,brvbar:0x00A6,sect:0x00A7,uml:0x00A8,copy:0x00A9,ordf:0x00AA,laquo:0x00AB,
        not:0x00AC,shy:0x00AD,reg:0x00AE,macr:0x00AF,deg:0x00B0,plusmn:0x00B1,sup2:0x00B2,sup3:0x00B3,
        acute:0x00B4,micro:0x00B5,para:0x00B6,middot:0x00B7,cedil:0x00B8,sup1:0x00B9,ordm:0x00BA,raquo:0x00BB,
        frac14:0x00BC,frac12:0x00BD,frac34:0x00BE,iquest:0x00BF,Agrave:0x00C0,Aacute:0x00C1,Acirc:0x00C2,Atilde:0x00C3,
        Auml:0x00C4,Aring:0x00C5,AElig:0x00C6,Ccedil:0x00C7,Egrave:0x00C8,Eacute:0x00C9,Ecirc:0x00CA,Euml:0x00CB,
        Igrave:0x00CC,Iacute:0x00CD,Icirc:0x00CE,Iuml:0x00CF,ETH:0x00D0,Ntilde:0x00D1,Ograve:0x00D2,Oacute:0x00D3,
        Ocirc:0x00D4,Otilde:0x00D5,Ouml:0x00D6,times:0x00D7,Oslash:0x00D8,Ugrave:0x00D9,Uacute:0x00DA,Ucirc:0x00DB,
        Uuml:0x00DC,Yacute:0x00DD,THORN:0x00DE,szlig:0x00DF,agrave:0x00E0,aacute:0x00E1,acirc:0x00E2,atilde:0x00E3,
        auml:0x00E4,aring:0x00E5,aelig:0x00E6,ccedil:0x00E7,egrave:0x00E8,eacute:0x00E9,ecirc:0x00EA,euml:0x00EB,
        igrave:0x00EC,iacute:0x00ED,icirc:0x00EE,iuml:0x00EF,eth:0x00F0,ntilde:0x00F1,ograve:0x00F2,oacute:0x00F3,
        ocirc:0x00F4,otilde:0x00F5,ouml:0x00F6,divide:0x00F7,oslash:0x00F8,ugrave:0x00F9,uacute:0x00FA,ucirc:0x00FB,
        uuml:0x00FC,yacute:0x00FD,thorn:0x00FE,yuml:0x00FF,OElig:0x0152,oelig:0x0153,Scaron:0x0160,scaron:0x0161,
        Yuml:0x0178,fnof:0x0192,circ:0x02C6,tilde:0x02DC,Alpha:0x0391,Beta:0x0392,Gamma:0x0393,Delta:0x0394,
        Epsilon:0x0395,Zeta:0x0396,Eta:0x0397,Theta:0x0398,Iota:0x0399,Kappa:0x039A,Lambda:0x039B,Mu:0x039C,
        Nu:0x039D,Xi:0x039E,Omicron:0x039F,Pi:0x03A0,Rho:0x03A1,Sigma:0x03A3,Tau:0x03A4,Upsilon:0x03A5,
        Phi:0x03A6,Chi:0x03A7,Psi:0x03A8,Omega:0x03A9,alpha:0x03B1,beta:0x03B2,gamma:0x03B3,delta:0x03B4,
        epsilon:0x03B5,zeta:0x03B6,eta:0x03B7,theta:0x03B8,iota:0x03B9,kappa:0x03BA,lambda:0x03BB,mu:0x03BC,
        nu:0x03BD,xi:0x03BE,omicron:0x03BF,pi:0x03C0,rho:0x03C1,sigmaf:0x03C2,sigma:0x03C3,tau:0x03C4,
        upsilon:0x03C5,phi:0x03C6,chi:0x03C7,psi:0x03C8,omega:0x03C9,thetasym:0x03D1,upsih:0x03D2,piv:0x03D6,
        ensp:0x2002,emsp:0x2003,thinsp:0x2009,zwnj:0x200C,zwj:0x200D,lrm:0x200E,rlm:0x200F,ndash:0x2013,
        mdash:0x2014,lsquo:0x2018,rsquo:0x2019,sbquo:0x201A,ldquo:0x201C,rdquo:0x201D,bdquo:0x201E,dagger:0x2020,
        Dagger:0x2021,bull:0x2022,hellip:0x2026,permil:0x2030,prime:0x2032,Prime:0x2033,lsaquo:0x2039,rsaquo:0x203A,
        oline:0x203E,frasl:0x2044,euro:0x20AC,image:0x2111,weierp:0x2118,real:0x211C,trade:0x2122,alefsym:0x2135,
        larr:0x2190,uarr:0x2191,rarr:0x2192,darr:0x2193,harr:0x2194,crarr:0x21B5,lArr:0x21D0,uArr:0x21D1,
        rArr:0x21D2,dArr:0x21D3,hArr:0x21D4,forall:0x2200,part:0x2202,exist:0x2203,empty:0x2205,nabla:0x2207,
        isin:0x2208,notin:0x2209,ni:0x220B,prod:0x220F,sum:0x2211,minus:0x2212,lowast:0x2217,radic:0x221A,
        prop:0x221D,infin:0x221E,ang:0x2220,and:0x2227,or:0x2228,cap:0x2229,cup:0x222A,int:0x222B,
        there4:0x2234,sim:0x223C,cong:0x2245,asymp:0x2248,ne:0x2260,equiv:0x2261,le:0x2264,ge:0x2265,
        sub:0x2282,sup:0x2283,nsub:0x2284,sube:0x2286,supe:0x2287,oplus:0x2295,otimes:0x2297,perp:0x22A5,
        sdot:0x22C5,lceil:0x2308,rceil:0x2309,lfloor:0x230A,rfloor:0x230B,lang:0x2329,rang:0x232A,loz:0x25CA,
        spades:0x2660,clubs:0x2663,hearts:0x2665,diams:0x2666
    };

    mvvm.CssClassBinding = mvvm.Binding.extend({
        constructor: function (options) {
            var t = this;
            this.options = $x.extend({}, options);
            this.options = _.defaults(this.options, this.defaults);

            if (t.options.model === null || t.options.path === null || t.options.el === null || t.options.cssClass === null) {
                throw "model, path, cssClass, and el are required";
            }

            t.$el = $(t.options.el);
            _.bindAll(this, 'value', 'modelChanged', 'bindModel', 'unbindModel', 'setElClasses', 'dispose');
            this.bindModel()
            //this.bindEl();
            this.initialize();
        },

        initialize: function () {
            var t = this;
            t.setElClasses(t.value());
            t.$el.removeAttr('data-xt-class-' + t.options.cssClass);
        },

        defaults: {
            model: null,
            expression: null,
            el: null,
            attr: null
        },

        bindModel: function () {
            this._modelPath = this.resolveModelExpression(this.options.model, this.options.expression, { evalVal: false, allowPartial: false });
            this.bindModelExpression(this.options.model, this.options.expression, this.modelChanged);
        },

        unbindModel: function () {
            var t = this;
            this.unbindModelExpression(this.options.model, this.options.expression, this.modelChanged);
        },

        value: function () {
            var t = this;
            if (typeof (this._modelPath) === 'undefined' || this._modelPath.length === 0) { return; }

            var val = this._modelPath[this._modelPath.length - 1];
            if (_.isFunction(val)) {
                val = val();
            }
            
            return this._applyBindExpression(this.options.expression, val, this.options.model);
        },

        modelChanged: function (event, model, options) {
            var t = this;

            this._modelPath = this.resolveModelExpression(this.options.model, this.options.expression, { evalVal: false, allowPartial: false });
            //t.unbindModelExpression(this.options.model, this.options.expression, this.modelChanged);
            //t.options.model.off('all', null, this);

            //this.bindModel();
            t.setElClasses(t.value());
        },

        setElClasses: function (val) {
            var t = this;
            if (val) {
                t.$el.addClass(t.options.cssClass, val);
            } else {
                t.$el.removeClass(t.options.cssClass, val);
            }
        },

        dispose: function () {
            this.unbindModel();
        }
    });
    $x.extend(mvvm.CssClassBinding.prototype, mvvm.ModelNavMixins);

    mvvm.SelectBinding = mvvm.Binding.extend({
        constructor: function (options) {
            var t = this;
            this.options = $x.extend({}, options);
            this.options = _.defaults(this.options, this.defaults);

            if (t.options.model === null || t.options.path === null || t.options.el === null) {
                throw "model, path, and el options are required";
            }
            t.$el = $(t.options.el);
            _.bindAll(this, 'value', 'bindModel', 'unbindModel', 'modelChanged', 'bindEl', 'createOptions', 'dispose');
            this.bindModel()
            this.bindEl();
            this.initialize();
        },

        initialize: function () {
            var t = this;
            var curr = t.$el.val();
            t.createOptions(t.value());
            var after = t.$el.val();
            if (after != curr) {
                t.$el.trigger('change');
            }
        },

        defaults: {
            model: null,
            path: null,
            el: null,
            textField: 'name',
            valueField: 'value'
        },

        bindModel: function () {
            this._modelPath = this.resolveModelPath(this.options.model, this.options.path, { evalVal: false, allowPartial: false });
            this.bindModelPath(this.options.model, this.options.path, this.modelChanged);
        },

        unbindModel: function () {
            var t = this;
            _.each(t._bindingCallbacks, function (elem, idx) {
                t.unbindModelExpression(elem.model, elem.expression, elem.callback);
            });
            this._bindingCallbacks = [];
        },

        value: function () {
            var t = this;
            if (typeof (this._modelPath) === 'undefined' || this._modelPath.length === 0) { return; }

            var val = this._modelPath[this._modelPath.length - 1];
            if (_.isFunction(val)) {
                return val();
            } else {
                return val;
            }
        },

        modelChanged: function (event, model, options) {
            var t = this;
            this._modelPath = this.resolveModelPath(this.options.model, this.options.path, { evalVal: false, allowPartial: false });
            //t.unbindModelPath(this.options.model, this.options.path, this.modelChanged);
            //t.options.model.off('all', null, this);

            //this.bindModel();
            t.createOptions(t.value());
        },

        bindEl: function () {
            var t = this;
            //Must be of type <select>
            if (!t.options.el.is('select')) {
                throw 'el must be of node type <select>';
            }

            var $el = $(t.options.el);
        },

        unbindEl: function () {
            var t = this;
            var $el = $(t.options.el);
            $el.off('change.binding', t.elChanged);
            this._modelPath = null;
        },

        createOptions: function (val) {
            var t = this;
            var $el = $(t.options.el);

            var currVal = $el.val();

            $el.empty();
            var createOption = function (obj, key, list) {
                var title = _.resultBB(obj, t.options.textField);
                var value = _.resultBB(obj, t.options.valueField);
                var opt = $(document.createElement('option'));
                opt.text(title).val(value)
                $el.append(opt);
            };

            if (val instanceof mvvm.Collection) {
                val.each(createOption);
            } else {
                _.each(val, createOption);
            }
            //If possible, set it back to the value it was before
            if($el.children('option').length > 1){
                $el.val(currVal);
            }
        },

        dispose: function () {
            this.unbindModel();
            this.unbindEl();
        }
    });
    $x.extend(mvvm.SelectBinding.prototype, mvvm.ModelNavMixins);

    mvvm.Trigger = function (options) {
        var t = this;
        if (arguments === null || arguments.length === 0) {
            options = {};
        }

        t.options = _.defaults(options, t.defaults);

        t.initialize.apply(this);
    }

    $x.extend(mvvm.Trigger.prototype, {
        defaults: {
            el: null,
            event: 'click'
        },
        initialize: function () {
            _.bindAll(this,
                'onTrigger',
                'onTriggerInv',
                'onTriggerInternal',
                'onTriggerInvInternal',
                'bind',
                'unbind',
                'dispose');
            this.bind();
        },
        onTrigger: function (evt) { },
        onTriggerInv: function (evt) { },
        onTriggerInternal: function(evt){
            var t = this;
            var nEvt = new mvvm.Event({event: t.options.event, target: evt.target});
            t.onTrigger(nEvt);
            if(nEvt.isDefaultPrevented())
            { evt.preventDefault(); }
        },
        onTriggerInvInternal: function(evt){
            var t = this;
            var nEvt = new mvvm.Event({event: t.options.event});
            t.onTrigger(nEvt);
            if(nEvt.isDefaultPrevented())
            { evt.preventDefault(); }           
        },
        bind: function () {
            var t = this;
            var $el = $(t.options.el);
            switch (t.options.event) {
                case null:
                    throw "Event name cannot be null";
                    break;
                case 'hover':
                    $el.on('mouseenter.binding', t.onTriggerInternal);
                    $el.on('mouseleave.binding', t.onTriggerInvInternal);
                    break;
                default:
                    $el.on(t.options.event + '.binding', t.onTriggerInternal);
                    break;
            }
        },

        unbind: function () {
            var t = this;
            var $el = $(t.options.el);
            switch (t.options.event) {
                case null:
                    throw "Event name cannot be null";
                    break;
                case 'hover':
                    $el.off('mouseenter.binding', t.onTriggerInternal);
                    $el.on('mouseleave.binding', t.onTriggerInvInternal);
                    break;
                default:
                    $el.off(t.options.event + '.binding', t.onTriggerInternal);
                    break;
            }
        },

        dispose: function () {
            this.unbind();
        }
    });

    mvvm.Trigger.extend = $x.extendClass;

    mvvm.StyleTrigger = mvvm.Trigger.extend({
        initialize: function () {
            mvvm.Trigger.prototype.initialize.call(this);
        },

        defaults: {
            el: null,
            event: 'click',
            target: null
        },

        onTrigger: function () {
            var t = this;
            var $el = $(t.options.el);

            var target = $el;
            if (t.options.target != null) {
                target = t.getTarget($el);
            }
            //Process any CSS classes that are specified
            if (t.options.cssClass != null) {
                if (t.options.cssClass instanceof Array) {
                    _.each(t.options.cssClass, function (elem, idx, list) {
                        target.addClass(elem);
                    });
                } else {
                    target.addClass(t.options.cssClass);
                }
            }
            //Process any CSS styles, saving the existing ones
            if (t.options.styles != null) {
                t.prevStyles = {};
                _.each(t.options.styles, function (value, key, list) {
                    t.prevStyles[key] = target.css(key);
                    target.css(key, value);
                });
            }
        },

        onTriggerInv: function () {
            var target = $el;
            if (t.options.target != null) {
                target = t.getTarget($el);
            }

            //Process any CSS classes that are specified
            if (this.options.cssClass != null) {
                if (this.options.cssClass instanceof Array) {
                    _.each(this.options.cssClass, function (elem, idx, list) {
                        target.removeClass(elem);
                    });
                } else {
                    target.removeClass(this.options.cssClass);
                }
            }
            //Process any CSS styles, saving the existing ones
            if (this.options.styles != null) {
                this.prevStyles = {};
                _.each(this.options.styles, function (value, key, list) {
                    target.css(key, this.prevStyles[key]);
                });
            }
        },

        getTarget: function ($el) {
            return $el;
        }
    });
    $x.extend(mvvm.StyleTrigger.prototype, mvvm.ModelNavMixins);

    mvvm.Actions = _.extend({}, {
        
    });
    mvvm.ActionTrigger = mvvm.Trigger.extend({
        defaults: {
            el: null,
            event: 'click',
            context: {},
            action: null,
            data: undefined
        },
        initialize: function () {
            mvvm.Trigger.prototype.initialize.call(this);
        },

        onTrigger: function (evt) {
            var t = this;
            if (t.options.context != null && t.options.action != null) {
                var action = t.resolveModelExpression(t.options.context, t.options.action, { evalVal: false });
                if (_.isArray(action)) {
                    action = _.last(action);
                }

                var value = t.options.data;
                var hasValue = (undefined !== t.options.data);
                if (hasValue && _.has(value, 'path')) {
                    evt.data = t.resolveModelExpressionValue(t.options.context, value);
                }
                
                action(evt);
            }
        }
    });
    $x.extend(mvvm.ActionTrigger.prototype, mvvm.ModelNavMixins);

    var createPlaceholderNode = function () {
        return document.createTextNode('');
    };

    var tmplBlockInst = function (options) {
        var t = this;
        t.options = $x.extend({}, options);
        if (arguments.length > 0) {
            _.defaults(t.options, t.defaults);
            if (options.el) {
                this.setEl(options.el);
            }
        }

        t.initialize();
    };

    tmplBlockInst.extend = $x.extendClass;
    $x.extend(tmplBlockInst.prototype, {

        defaults: {
            block: null,
            context: null,
            el: null
        },
        initialize: function () {
            var t = this;
            t.childInstances = [];
            _.bindAll(t, 'render');
        },
        render: function () { },

        renderInternal: function (block, el, context) {
            var t = this, block = block ? block : this.options.block;

            var $el = $(el);
            _.each(block.childNodes, function(val, idx){
               var inst = val.createInstance($el, context);
               t.childInstances.push(inst);
               if(inst instanceof tmplBlockInst){
                 inst.render();  
               }
            });
        },

        renderLocalBindingsAndTriggers: function(block, el, context){
            var t = this, block = block ? block : this.options.block;
            var $el = $(el);
            var nodes = _.filter(block.childNodes, function(b){ return (b.type.type === 'bind' || b.type.type === 'trigger') && b.position.length === 0; });
            
            _.each(nodes, function(val, idx){
               var inst = val.createInstance($el, context);
               t.childInstances.push(inst);
               if(inst instanceof tmplBlockInst){
                 inst.render();  
               }
            });
        },
        setEl: function (el) {
            this.el = el;
            this.$el = $(el);
        },

        resolveElement: function ($el, indices) {
            var curr = $el;
            _.each(indices, function (val) {
                curr = curr.contents().eq(val);
            });

            return curr;
        },

        clear: function () {
            var t = this;
            _.each(t.childInstances, function(item){
               if(item.dispose){
                   item.dispose();
               }
            });
            t.childInstances = [];
            t.$el.empty();
        },
        dispose: function () {
            var t = this;
            t.clear();
        },

        createContext: function (properties, baseContext) {
            var t = this, context;
            if (baseContext != null) {
                context = t.options.context.clone();
            } else {
                context = new mvvm.Model();
            }

            _.each(properties, function (value, key, list) {
                context.set(key, value);
                if(!_.isUndefined(value) && !_.isNull(value)){
                    context.createField(key, { type: value.constructor });
                }
            });
            return context;
        }

    });
    $x.extend(tmplBlockInst.prototype, mvvm.ModelNavMixins);

    var TemplateBlockInst = tmplBlockInst.extend({
        initialize: function () {
            tmplBlockInst.prototype.initialize.apply(this);
            _.bindAll(this, 'render');
        },

        render: function () {
            var t = this;
            var block = t.options.block;
            t.setEl(block.$el.clone());
            var context = t.createContext(t.options.context);
            //var context = t.createContext({ model: t.options.context });
            t.renderInternal(block, t.$el, context);
            t.$el.removeClass('xt-template');
        }
    });

    var ChildTemplateBlockInst = tmplBlockInst.extend({
        initialize: function () {
            var t = this;
            tmplBlockInst.prototype.initialize.apply(this);
            _.bindAll(t, 'modelChanged', 'render');
            var mod = t.options.block.model;
            t.bindModelExpression(t.options.context, mod, t.modelChanged);
            t.model = t.resolveModelExpressionValue(t.options.context, mod);
        },
        modelChanged: function () {
            var mod = t.options.block.model;
            t.unbindModelPath(t.options.context, mod, t.modelChanged);
            t.bindModelExpression(t.options.context, mod, t.modelChanged);
            t.model = t.resolveModelExpressionValue(t.options.context, mod);
        },

        render: function () {
            var t = this;
            var block = t.options.block;
            t.clear();
            
            var template = block.template;
            //If the model is a ViewModel, we should call it's render method
            //Otherwise, render the partial template specified
            if((_.isUndefined(template) || _.isNull(template)) && (t.model instanceof mvvm.ViewModel)){
                var rplc = t.model.render();
                rplc.insertBefore(t.$el.eq(0));
                t.$el.remove();
                //t.$el.replaceWith(rplc);
                t.setEl(rplc);                
            }else{

                if(_.isObject(template)){
                    template = t.resolveModelExpressionValue(t.options.context, template);
                }
                $x.template(template)('destroy', t.$el);
                var rplc = $x.template(template)(t.model);
                replace.insertBefore(t.$el.eq(0));
                t.$el.remove();
                //t.$el.replaceWith(rplc);
                t.setEl(rplc);
            }
        },
        dispose: function(){
            var t = this;
            var block = t.options.block;
            t.clear();
            var template = block.template;
            if((_.isUndefined(template) || _.isNull(template)) && (t.model instanceof mvvm.ViewModel)){
                t.model.dispose();
            }            
        }
    });

    var IfBlockInst = tmplBlockInst.extend({
        initialize: function () {
            var t = this,
            block = t.options.block;
            t.current = null;

            //Expand the t.$el element to include all the else-if and else conditions
            var $el = t.$el;
            var $next = $el.next();
            while ($next.filter('[data-xt-else-if]').length > 0) {
                t.$el = t.$el.add($next);
                $next = $next.next();
            }
            if ($next.filter('[data-xt-else]').length > 0) {
                t.$el = t.$el.add($next);
            }
            tmplBlockInst.prototype.initialize.apply(t);
            _.bindAll(t, 'render');
            this.branches = [];
            _.each(block.branches, function (val, idx) {
                var branch = {};
                branch.callback = _.bind(t.modelChanged, t, idx);
                branch.value = t.resolveModelExpressionValue(t.options.context, val.expression);

                if (t.current === null && branch.value) { t.current = idx; };
                t.bindModelExpression(t.options.context, val.expression, branch.callback);
                t.branches.push(branch);
            });
        },
        modelChanged: function (idx) {
            var t = this;
            var block = t.options.block;
            var bbranch = block.branches[idx];
            var branch = t.branches[idx];
            var curr = branch.value;

            //Changing val to bbranch, must have changed it during some refactoring
            branch.value = t.resolveModelExpressionValue(t.options.context, bbranch.expression);
            if ((t.current === null || idx <= t.current) && branch.value != curr) {
                var next = null;
                for (var i = 0; i < t.branches.length; i++) {
                    if (this.branches[i].value) {
                        next = i;
                        break;
                    }
                }
                if (next === null && block.defaultBranch !== null) {
                    next = t.branches.length;
                }
                t.current = next;
                t.render();
            }



        },
        render: function () {
            var t = this;
            var node = t.options.block;
            var block = (t.current !== null && t.current < t.branches.length) ? node.branches[t.current] : node.defaultBranch;
            t.clear();

            var $next = null;
            if (block) {
                var $next = block.$el.clone();
                //Clean up the HTML
                $next.removeAttr('data-xt-if');
                t.renderInternal(block, $next, t.options.context);
            } else {
                $next = $(createPlaceholderNode());
            }
            //Ensure we keep the same number of HTML nodes as the template by creating placeholder text
            //nodes to stand in for all the branches not taken
            for (var i = 0; i < t.branches.length - 1; i++) {
                $next = $next.add(createPlaceholderNode());
            }
            if (node.defaultBranch !== null) {
                $next = $next.add(createPlaceholderNode());
            }

            if (t.$el.eq(0).prev().length) {
                $next.insertBefore(t.$el.eq(0));
            } else {
                t.$el.eq(0).parent().prepend($next);
            }
            t.$el.remove();
            t.setEl($next);

            if (block && _.has(block, 'onrender')) {
                var action = t.resolveModelExpression(t.options.context, block.onrender);
                if (_.isArray(action) && action.length > 0) {
                    action = _.last(action);
                    action($next);
                }
            }
        }
    });

    var ForeachBlockInst = tmplBlockInst.extend({
        initialize: function () {
            var t = this;
            tmplBlockInst.prototype.initialize.apply(this);
            var mod = t.options.block.expression;
            _.bindAll(t, 'render', 'modelChanged');

            t.bindModelExpression(t.options.context, mod, t.modelChanged);
            t.value = t.resolveModelExpressionValue(t.options.context, mod);
        },
        modelChanged: function (event) {
            //TODO: Update this method so that, if the change is an item being
            //added or removed and no indexer is specified (another feature to
            //be implemented), on render/remove the changed element
            var t = this;
            var mod = t.options.block.expression;

            var nextVal = t.resolveModelExpressionValue(t.options.context, mod);
            var update = (t.value != nextVal) || event === 'add' || event === 'remove';
            t.value = nextVal;

            if (update) {
                t.value = t.resolveModelExpressionValue(t.options.context, mod);
                t.render();
            }

        },
        render: function () {
            var t = this;
            var block = t.options.block;
            t.clear();
            
            t.renderLocalBindingsAndTriggers(t.options.block, t.$el, t.options.context);
            
            if (t.value && t.value.length > 0) {
                var iterName = block.iterator;
                var indexerName = _.has(block, 'indexer')?block.indexer:undefined;
                var innerElem = block.$el.clone().children();

                //Clean up the HTML
                t.$el.removeAttr('data-xt-foreach');
                t.$el.removeAttr('data-xt-iterator');
                var rerender = function (elem, idx, list) {

                    //var iterVal = _.last(t.resolveModelPath(elem, t.options.block.options.expression, {allowPartial: false}));
                    var attrs = {};
                    
                    if(indexerName !== undefined){
                        attrs[indexerName] = idx;
                    }
                    attrs[iterName] = elem; //iterVal;
                    var context = t.createContext(attrs, t.options.context);

                    var rplc = $(block.el).clone();
                    t.renderInternal(t.options.block, rplc, context);
                    t.$el.append(rplc.children());
                }

                //Just in case the property is not a XMVVM collection
                if (t.value instanceof mvvm.Collection) {
                    t.value.forEach(rerender);
                } else {
                    _.each(t.value, rerender);
                }
            }

            if (_.has(block, 'onrender')) {
                var action = t.resolveModelExpression(t.options.context, block.onrender);
                if (_.isArray(action) && action.length > 0) {
                    action = _.last(action);
                    action($next);
                }
            }
        }
    });

    var templateInstances = {};
    mvvm.Template = function (block, context) {
        var t = this;
        t.block = block;
        t.context = context;
        t.tmplID = Math.floor(Math.random() * 100000000);
        templateInstances[t.tmplID] = this;
    };

    $x.extend(mvvm.Template.prototype, {
        render: function () {
            var t = this;
            var inst = new TemplateBlockInst({
                block: t.block,
                context: t.context
            });
            inst.render();
            var $el = inst.$el;
            $el.data('template-id', t.tmplID);
            return $el.children();
        },

        dispose: function () {

        }
    });

    mvvm.Template.compile = function () {
        var el;
        if (arguments.length > 2) { throw "Invalid arguments"; }
        if (arguments[0] instanceof $) {
            el = arguments[0];
        } else {
            el = $(arguments[0]);
        }
        // TODO: Testing out wrapping the template in a <div> before parsing to deal with
        // templates that don't have a single root element.  Will need to unwrap during
        // rendering.
        el = $('<div></div>').append(el);
        var parser = new mvvm.templateParser();
        var block = parser.parse(el);//new tmplBlock({ el: el });
        if (arguments.length === 2 && arguments[1] === true) { return block; }

        var handleCommand = function (cmd, model, options) {
            if(!(_.isString(cmd))){
                options=model;
                model = cmd;
                var context = {model: model};
                if(options && options.context){
                    $x.extend(context, options.context);
                }
                var tmpl = new mvvm.Template(block, context);
                return tmpl.render();
            }

            var cmd = arguments[0];
            var $el;
            if (!(_.isString(cmd))) { throw "Invalid argument (1), String expected"; }


            switch (cmd) {
                case 'destroy':
                    if (arguments.length !== 2) { throw "Invalid number of arguments"; }
                    $el = arguments[1];
                    if (!($el instanceof $)) { throw "Invalid argument (2), jQuery expected"; }
                    if ($el.data('template-id')) {
                        templateInstances[$el.data('template-id')].dispose();
                    }
                    break;
            }
        }
        return handleCommand;
    };

    if (typeof (test) !== 'undefined') {
        mvvm.templateInstances = templateInstances;
    }
    
    return mvvm;
}));

