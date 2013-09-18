(function ($, _, $x) {
    'use strict';

    var mvvm = $x.namespace('XMVVM');
    Backbone.Model.isParentTypeOf = function (type) {
        return Backbone.Model.prototype.isPrototypeOf(type.prototype);
    };

    Backbone.Collection.isParentTypeOf = function (type) {
        return Backbone.Collection.prototype.isPrototypeOf(type.prototype);
    };

    //Define our own extend method that uses the enhanced extend with
    //getter and setter support
    var extend = $x.extendClass = function(protoProps, staticProps) {
      var parent = this;
      var child;

      // The constructor function for the new subclass is either defined by you
      // (the "constructor" property in your `extend` definition), or defaulted
      // by us to simply call the parent's constructor.
      if (protoProps && _.has(protoProps, 'constructor')) {
        child = protoProps.constructor;
      } else {
        child = function(){ return parent.apply(this, arguments); };
      }

      // Add static properties to the constructor function, if supplied.
      $x.extend(child, parent, staticProps);

      // Set the prototype chain to inherit from `parent`, without calling
      // `parent`'s constructor function.
      var Surrogate = function(){ this.constructor = child; };
      Surrogate.prototype = parent.prototype;
      child.prototype = new Surrogate;

      // Add prototype properties (instance properties) to the subclass,
      // if supplied.
      if (protoProps) $x.extend(child.prototype, protoProps);

      // Set a convenience property in case the parent's prototype is needed
      // later.
      child.__super__ = parent.prototype;

      return child;
    };
    
    var createField = function (key, options) {
        var t = this;
        //Allow just the field type to be passed in rather than a full field definition
        if (_.isFunction(options)) {
            options = { type: options };
            t.fields[key] = options;
        }
        if (t.fields && !_.has(this, 'fields')) {
            //If this object is getting fields beyond those in its prototype
            //Copy fields from prototype into a collection for this object
            t.fields = $x.extend({}, t.fields);
        }
        if(!_.has(this.fields, key)){
            t.fields[key] = options;
        }
        t.fields[key]["name"] = key;

        t[key] = _.bind(function () {
            if (arguments.length === 1) {
                this.set(key, arguments[0]);
            } else {
                return this.get(key);
            }
        }, t);
    };  
  
    _.mixin({
        resultBB: function (obj, property, evaluate) {
            if (evaluate === undefined) { evaluate = true; }
            var val = obj[property];
            if (undefined === val && obj instanceof Backbone.Model) {
                val = obj.get(property);
            }
            if (undefined !== val && evaluate && _.isFunction(val)) {
                val = val();
            }
            return val;
        },
        startsWith: function (val, prefix) {
            return val.substr(0, prefix.length) === prefix;
        },
        endsWith: function (val, suffix) {
            var startPos = val.length - suffix.length;
            return (startPos >= 0 && val.substr(startPos) === suffix);
        }
    });

    var eid_iter = 0;
    mvvm.Event = function (options) {
        this.eid = 'e' + eid_iter;
        eid_iter++;
        $x.extend(this, options);
    };
    mvvm.Event.extend = extend;
    mvvm.Model = Backbone.Model.extend({
        constructor: function (attributes, options) {
            var t = this;
            _.defaults(t, {
                fields: {}
            });
            _.each(this.fields, function (val, key, list) {
                t.createField(key, val);
            });

            Backbone.Model.apply(this, [attributes, options]);
            _.bindAll(this, 'createField', 'set');
        },
        fields: {},
        createField: function (key, options) {
            createField.call(this, key, options);
        },
        clone: function () {
            var t = this;
            var ret = Backbone.Model.prototype.clone.apply(t);
            _.each(t.fields, function (val, name, list) {
                ret.createField(name, val);
            });
            return ret;
        },
        trigger: function (event) {
            var args = Array.prototype.slice.call(arguments);
            var evt;
            if (arguments.length > 1 && !(arguments[1] instanceof mvvm.Event)) {

                var evtType = event;
                var eIdx = event.indexOf(':');
                if (eIdx !== -1) {
                    evtType = event.substr(0, eIdx + 1);
                }
                switch (evtType) {
                    case 'add':
                    case 'remove':
                    case 'destroy':
                        evt = new mvvm.Event({ model: arguments[1], collection: arguments[2], options: arguments[3] });
                        break;
                    case 'reset':
                    case 'sort':
                        evt = new mvvm.Event({ collection: arguments[1], options: arguments[2] });
                        break;
                    case 'change':
                        evt = new mvvm.Event({ model: arguments[1], options: arguments[2] });
                        break;
                    case 'request':
                    case 'error':
                        evt = new mvvm.Event({ model: arguments[1], xhr: arguments[2], options: arguments[3] });
                        break;
                    case 'sync':
                        evt = new mvvm.Event({ model: arguments[1], resp: arguments[2], options: arguments[3] });
                        break;
                    case 'invalid':
                        evt = new mvvm.Event({ model: arguments[1], error: arguments[2], options: arguments[3] });
                        break;
                    case 'route':
                        evt = new mvvm.Event({ params: arguments[1] });
                        break;
                    case 'change:':
                        evt = new mvvm.Event({ model: arguments[1], value: arguments[2], options: arguments[3] });
                        break;
                    case 'route:':
                        evt = new mvvm.Event({ route1: arguments[1], route2: arguments[2], params: arguments[3] });
                        break;
                }
                if (evt != null) {
                    Backbone.Model.prototype.trigger.apply(this, [event, evt]);
                } else {
                    Backbone.Model.prototype.trigger.apply(this, arguments);
                }
            } else if(1 == arguments.length) {
                if(this instanceof mvvm.Model){
                    evt = new mvvm.Event({ model: this });
                }else if(this instanceof mvvm.Collection){
                    evt = new mvvm.Event({ collection: this });
                }
                
                args.push(evt);
                Backbone.Model.prototype.trigger.apply(this, args);
            }else {
                Backbone.Model.prototype.trigger.apply(this, arguments);
            }


        },
        set: function (key, val, options) {
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

            _.each(attrs, function (value, name, list) {
                var field, valid;
                if (fields != null && _.has(fields, name)) {
                    field = fields[name];
                    val = t._prepareValue(field, value);
                    valid = true;
                    if (_.isFunction(field.validate)) {
                        valid = field.validate(value);
                    }
                    if (valid !== true) {
                        throw valid;
                    }
                }

                curr = t[name];
                if (curr != null && (curr instanceof Backbone.Model || curr instanceof Backbone.Collection)) {
                    curr.off('all', retrigger, this);
                }

                //If it's a model or collection, bubble the change events
                if (value instanceof Backbone.Model || value instanceof Backbone.Collection) {
                    var retrigger = function (evtName, evt) {
                        var args = Array.prototype.slice.call(arguments);
                        // Prevent cycles if two models both reference each other
                        if (_.has(evt, 'model') && evt.model === t || (_.has(evt, 'recipients') && _.has(evt.recipients, t.cid))) {
                            return;
                        }
                        evt.recipients = evt.recipients || {};
                        evt.recipients[t.cid] = true;
                        t.trigger.apply(t, args);
                    }

                    var currVal = t.get(name);
                    if (currVal) { currVal.off('all', retrigger, t.cid + name); }
                    value.on('all', retrigger, t.cid + name);
                }
            });
            Backbone.Model.prototype.set.apply(this, [attrs, options]);

        },

        _prepareValue: function (field, value) {
            if (undefined === value || null === value) { return value; }
            switch (field.type) {
                case 'int':
                    if (typeof (value) !== 'int') { value = parseInt(value); }
                    break;
                case Number:
                    if (!_.isNumber(value)) { value = parseFloat(value); }
                    break;
                case Boolean:
                    if (!_.isBoolean(value)) { value = value == true; }
                    break;
                case String:
                    if (!_.isString(value)) { value = value + ''; }
                    break;
                case Date:
                    if (!(value instanceof Date)) {
                        if (_.isNumber(value)) { value = new Date(value); }
                        else if (_.isString(value)) { value = Date.parse(value); }
                    }
                    break;
                case Array:
                    if (!(value instanceof Array)) { throw 'Type mismatch'; }
                    break;
                default:
                    if (!(value instanceof field.type)) {
                        if (((field.type === Backbone.Model || Backbone.Model.isParentTypeOf(field.type))
                            && _.isObject(value))
                        || ((field.type === Backbone.Collection || Backbone.Collection.isParentTypeOf(field.type))
                            && (_.isObject(value) || _.isArray(value)))) {
                            value = new field.type(value);
                        } else if (!(value instanceof field.type)) {
                            throw 'Type mismatch';
                        }
                    }
                    break;
            }

            return value;
        },

        listenToEl: function () {
            if (arguments.length == 3) {
                this.$el.on(arguments[0], arguments[1], arguments[2]);
            } else if (arguments.length == 2) {
                this.$el.on(arguments[0], arguments[1]);
            }
        },

        parse: function (res) {
            _.each(this.fields, function (elem, index, list) {
                if (Backbone.Model.isParentTypeOf(elem.type) || Backbone.Collection.isParentTypeOf(elem.type)) {
                    res[elem.name] = new elem.type(res[elem.name], { parse: true });
                }
            });

            return res;
        },
                
        extend: function(protoProps, staticProps) {
            var obj = extend.call(this, protoProps, staticProps);
            if(_.has(protoProps, 'fields')){
                _.each(protoProps.fields, function(val, key){
                    createField.call(this, key, val);
                });
            }
        }
    });

    mvvm.Model.defaults = {
        useGetSet : false //option to support javascript getter/setter syntax
    };
    
    mvvm.Collection = Backbone.Collection.extend({
        unique: function () {
            var args = array.slice.call(arguments);
            args.unshift(this.models);
            return _.unique.apply(_, args);
        },

        _onModelEvent: function (event, model, collection, options) {

            //Override default behavior and trigger list updates regardless of whether they come from this list.
            if ((event === 'add' || event === 'remove') && collection !== this) { this.trigger.apply(this, arguments); }
            else { Backbone.Collection.prototype._onModelEvent.apply(this, arguments); }
        }
    });

    mvvm.View = Backbone.View.extend({

    });

    mvvm.ViewModel = mvvm.Model.extend({
        model: null,
        view: null,
        render: function () {
            var t = this;
            if (t.view) {
                return $x.template(t.view)(t.model);
            }
            return undefined;
        }
    });
    mvvm.ViewModel.extend = extend;


    var backboneGetSet = function(name, val){
        if(arguments.length == 1){
            return this.get(name);
        }else{
            this.set(name, val);
        }
    };
    
    mvvm.ModelNavMixins = {
        splitModelPath: function (path) {
            var matches;
            matches = path.match(/\w+(?=\.?)|(?=\[)\w+(?=\])/g)
            return matches;
        },

        resolveModelPath: function (model, path, options) {
            return this.resolveModelExpression(model, { path: path }, options);
        },
        resolveModelExpression: function (model, expression, options) {
            var path = expression.path;
            if (arguments.length < 3 || options === undefined) {
                options = {};
            }
            options = _.defaults(options, {
                evalVal: true,
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
                } else if(!lvl[parts[i]] && lvl instanceof Backbone.Model && lvl.has(parts[i])){
                    lvl = _.bind(backboneGetSet, lvl, parts[i] )
                }else {
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
            var result2 = this._applyBindExpression(expression, result1, model);
            if (result2 !== result1) {
                modLvl.push(result2);
            }

            return modLvl;
        },

        resolveModelExpressionValue: function (model, expression) {
            var t = this, val = t.resolveModelExpression(model, expression, { allowPartial: false });
            if (undefined !== val && _.isArray(val) && val.length > 0) {
                val = _.last(val);
            } else {
                val = undefined;
            }
            return val;
        },

        _applyBindExpression: function (expression, value, model) {
            var transform;
            if (_.has(expression, 'transform') && _.isString(expression.transform)) {
                transform = this.resolveModelPath(model, expression.transform, { evalVal: false, allowPartial: false });
                if (!_.isArray(transform)) {
                    throw 'Invalid transform, path does not exist';
                } else {
                    transform = _.last(transform);
                }
                if (_.isFunction(transform)) {
                    value = transform(value);
                } else {
                    throw 'Invalid transform, not a function';
                }
            }else if (_.has(expression, 'pattern') && _.isString(expression.pattern)) {
                value = $x.format(expression.Pattern, value);
            }

            return value;
        },
        bindModelPath: function (model, path, callback, options) {
            this.bindModelExpression(model, { path: path }, callback, options);
        },

        bindModelExpression: function (model, expression, callback, options) {
            var t = this;
            var parts = this.splitModelPath(expression.path);
            var lvls = this.resolveModelPath(model, parts);
            var record = { model: model, expression: expression, callback: callback };

            var verifyAffectedMod = function (evt) {
                var idx = _.indexOf(lvls, evt.model);

                //If the model isn't found or it is the leaf object, then we're not affected
                if (idx < 0 || idx == parts.length) { return false; }
                //However if the model is the first level (the base level), we always are affected
                else if (idx === 0) { return true; }
                //Otherwise check if the appropriate property name is in the list of changed props
                else if (_.has(evt.model.changed, parts[idx])) {
                    return true;
                }

                return false;
            }

            var checkCallback = function (event, evt) {
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
                    newVal = this._applyBindExpression(record.expression, newVal, record.model);
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
            if (!_.has(this, '_bindingCallbacks')) { t._bindingCallbacks = []; }

            record.checkCallback = _.bind(checkCallback, t);
            t._bindingCallbacks.push(record);

            model.on('all', record.checkCallback, t);
        },

        unbindModelPath: function (model, path, callback) {
            this.unbindModelExpression(model, { path: path }, callback);
        },

        unbindModelExpression: function (model, expression, callback) {
            var itm = _.find(this._bindingCallbacks, function (val) { return val.model === model && _.isEqual(val.expression, expression) && val.callback === callback; });
            model.off('all', itm.checkCallback, this);
        },
        setModelPathValue: function (model, path, value, useSetter) {
            useSetter = (undefined === useSetter) ? true : useSetter;

            var split = _.isArray(path) ? path : this.splitModelPath(path);
            var lvls = this.resolveModelPath(model, split, { evalVal: false, allowPartial: false });
            
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
} (jQuery, _, XUtil));

