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
        define('XMVVM-Model', ['jQuery', 'underscore', 'XUtil', 'XBase'], function($, _, $x, XBase) {
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
            t.fields[key] = options;
        }

        if (!_.has(this.fields, key)) {
            t.fields[key] = options;
        }
        t.fields[key]["name"] = key;

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
            Backbone.Model.prototype.set.apply(this, [fAttrs, options]);

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
        var obj = extend.call(t, protoProps, staticProps);
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
       isEmpty: function(val){
   return val === undefined || val === null || val === '';
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
                applyFilter: true,
                allowPartial: true
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

            if (href.substr(0, baseFull.length) === baseFull && $(this).attr('target') !== '_blank' && $(this).attr('rel') !== 'external') {
              var tail = href.substr(baseFull.length);
              
              var isRouted = t.canRoute(tail);
              if(isRouted){
                  evt.preventDefault(); 
                  t.navigate(tail, {trigger: true});
              }
            }
          });
        },        
        
        canRoute: function(fragmentOverride) {
          var pathStripper = /[?#].*$/;
          var fragment = this.root + Backbone.history.getFragment(fragmentOverride);
          
          fragment = fragment.replace(pathStripper, '');
          if(fragment = Backbone.history.fragment){ return false; }
          var matched = _.any(Backbone.history.handlers, function(handler) {
            if (handler.route.test(fragment)) {
              return true;
            }
          });
          return matched;
        }
    });
    return mvvm;
}));

