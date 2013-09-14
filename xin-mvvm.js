(function ($, _, $x) {
    'use strict';

    Backbone.Model.isParentTypeOf = function (type) {
        return Backbone.Model.prototype.isPrototypeOf(type.prototype);
    };

    Backbone.Collection.isParentTypeOf = function (type) {
        return Backbone.Collection.prototype.isPrototypeOf(type.prototype);
    };

    //Define our own extend method that uses the enhanced extend with
    //getter and setter support
    var extend = function(protoProps, staticProps) {
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
    var mvvm = $x.namespace('XMVVM');

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
    
    var modelTraversalUtils = {
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
                } else if(!lvl[parts[i]] && lvl instanceof Backbone.Model){
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

    mvvm.Binding = function () { };
    mvvm.Binding.extend = extend;

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
            _.bindAll(this, 'value', 'setModelAttr', 'modelChanged', 'bindModel', 'unbindModel', 'bindEl', 'setElProp', 'elChanged', 'dispose');
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
                return val();
            } else {
                return val;
            }
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

            this._modelPath = this.resolveModelExpression(this.options.model, this.options.expression, { evalVal: false, allowPartial: false });
            //t.unbindModelExpression(this.options.model, this.options.expression, this.modelChanged);
            //t.options.model.off('all', null, this);

            //this.bindModel();
            if (t.options.updateElement) {
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
                if (t.options.attr === 'value') {
                    t.$el.val(val);
                } else if('data-xt-src' == t.options.attr && t.$el.is('img')){
                    t.$el.attr('src', val)
                }else { t.$el.attr(t.options.attr, val); }
            }
        },
        elChanged: function (evt, ui) {
            this.setModelAttr($(evt.target).val());
        },

        dispose: function () {
            this.unbindModel();
            this.unbindEl();
        }
    });
    $x.extend(mvvm.AttributeBinding.prototype, modelTraversalUtils);

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
//            if (typeof (this._modelPaths) === 'undefined' || !_.has(this._modelPaths, path) || this._modelPaths[path].length === 0) { return; }
//
//            var modPath = this._modelPaths[path]
//            var val = modPath[modPath.length - 1];
//            if (_.isFunction(val)) {
//                return val();
//            } else {
//                return val;
//            }
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
                if(_.has(p, 'html') && p.html === 'true'){
                    vals.push(t.value(p));
                    html=true;
                }else{
                    var v = t.value(p);
                    v = v?t.escapeHtml(v):v;
                    vals.push(v);
                }
            });
            var text = $x.format.apply(this, vals).replace(/&#123;/, '{').replace(/&#125;/, '}');
            if(html){
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
                t.options.el.nodeValue = text;
            }
        },

        escapeHtml: function(unsafe) {
            return unsafe.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
         },
 
        dispose: function () {
            var t = this, paths = this.options.paths;

            _.each(paths, function (p) {
                t.unbindModelExpression(t.options.model, p, t._callbacks[p]);
            });
            delete t._callbacks;
            delete t._modelPaths;
        }
    });
    $x.extend(mvvm.TextNodeBinding.prototype, modelTraversalUtils);

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
                return val();
            } else {
                return val;
            }
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
    $x.extend(mvvm.CssClassBinding.prototype, modelTraversalUtils);

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
                t.unbindModelPath(elem.model, elem.path, elem.callback);
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

            if (val instanceof Backbone.Collection) {
                val.each(createOption);
            } else {
                _.each(val, createOption);
            }
            //If possible, set it back to the value it was before
            $el.val(currVal);
        },

        dispose: function () {
            this.unbindModel();
            this.unbindEl();
        }
    });
    $x.extend(mvvm.SelectBinding.prototype, modelTraversalUtils);

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
            this.bind();
        },
        onTrigger: function () { },
        onTriggerInv: function () { },
        bind: function () {
            var t = this;
            var $el = $(t.options.el);
            switch (t.options.event) {
                case null:
                    throw "Event name cannot be null";
                    break;
                case 'hover':
                    $el.on('mouseenter.binding', t.onTrigger);
                    $el.on('mouseleave.binding', t.onTriggerInv);
                    break;
                default:
                    $el.on(t.options.event + '.binding', t.onTrigger);
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
                    $el.off('mouseenter.binding', t.onTrigger);
                    $el.on('mouseleave.binding', t.onTriggerInv);
                    break;
                default:
                    $el.off(t.options.event + '.binding', t.onTrigger);
                    break;
            }
        },

        dispose: function () {
            this.unbind();
        }
    });

    mvvm.Trigger.extend = extend;

    mvvm.StyleTrigger = mvvm.Trigger.extend({
        initialize: function () {
            _.bindAll(this, 'onTrigger', 'onTriggerInv', 'bind', 'unbind', 'dispose');
            this.bind();
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
    $x.extend(mvvm.StyleTrigger.prototype, modelTraversalUtils);

    mvvm.ActionTrigger = mvvm.Trigger.extend({
        defaults: {
            el: null,
            event: 'click',
            context: {},
            action: null,
            value: undefined
        },
        initialize: function () {
            _.bindAll(this, 'onTrigger', 'onTriggerInv', 'bind', 'unbind', 'dispose');
            this.bind();
        },

        onTrigger: function () {
            var t = this;
            if (t.options.context != null && t.options.action != null) {
                var action = t.resolveModelExpression(t.options.context, t.options.action, { evalVal: false });
                if (_.isArray(action)) {
                    action = _.last(action);
                }

                var value = t.options.value;
                var hasValue = (undefined !== t.options.value);
                if (hasValue && _.has(value, 'path')) {
                    value = t.resolveModelExpressionValue(t.options.context, value);
                }
                if (undefined !== action && hasValue) {
                    action(value);
                } else if (undefined !== action) {
                    action();
                }
            }
        }
    });
    $x.extend(mvvm.ActionTrigger.prototype, modelTraversalUtils);

    var tmplBlock = function (options) {
        var t = this;
        t.options = $x.extend({}, options);
        if (arguments.length > 0) {
            _.defaults(t.options, t.defaults);
        }

        t._bindings = [];
        t._triggers = [];
        t._logicBlocks = [];
        t._nestedTemplates = [];

        t.excludeNestedScopes = function (idx) { return $(this).parentsUntil(t.$el, '[data-xt-foreach],[data-xt-if],[data-xt-elseif],[data-xt-else]').length > 0; };
        if (t.options.el) {
            if (t.options.el instanceof $) {
                t.options.el = t.options.el.get(0);
            }
            t.el = t.options.el;
            t.$el = $(t.el);
        }

        t.initialize();

        if (t.options.el
            && _.isString(t.options.type)) { t.parse(); }
    };


    tmplBlock.attributeBindingPattern = /^\{\{[a-zA-Z][\w\._]*\}\}$/;
    tmplBlock.textBindingPattern = /\{\{([a-zA-Z][\w\._]*|([a-zA-z]\w*\s*=\s*('[^']*'|"[^"]*"),?\s*)+)\}\}/g;
    tmplBlock.extend = extend;
    $x.extend(tmplBlock.prototype, {
        defaults: {
            el: null,
            type: 'template'
        },
        initialize: function () { },
        parse: function () {
            var t = this;

            //Handle triggers first so that we can remove them from the DOM
            //since they will never be rendered.  Otherwise, they must be
            //accounted for in calculating the position
            t.parseTriggers();

            t.parseForeaches();
            t.parseIfs();
            t.parseTemplates();

            t.parseSelectBindings();

            var blocks = t.$el.find('*').not(t.excludeNestedScopes);

            blocks.each(function (idx, elem) {
                t.parseAttributeBindings(elem);
                t.parseCssClassBindings(elem);
                t.parseTextBindings(elem);

            });
        },

        parseTriggers: function () {
            var t = this;
            var blocks = t.$el.find('code[data-xt-event]').not(t.excludeNestedScopes);
            blocks.each(function (idx, elem) {
                var $el = $(elem);
                var parent = $el.parent();
                var options = {
                    el: parent,
                    position: t.calculatePosition(parent, t.$el)
                };

                var action = $el.data('xt-action');
                var value = $el.data('xt-value');
                var styles = $el.data('xt-style');
                var cssClass = $el.data('xt-class');
                if (action) {
                    options.type = mvvm.ActionTrigger;
                    options.action = t.parseBinding(action, false);
                    if (undefined !== value) {
                        options.value = t.parseBinding(value, false);
                    }
                    options.event = $el.data('xt-event');
                } else if (styles != null || cssClass != null) {
                    options.type = mvvm.StyleTrigger;
                    options.styles = {};
                    if (styles != null) {
                        styles = $el.data('xt-style').split(';');
                        _.each(options.styles, function (val) { var vals = val.split(':'); option.styles[vals[0].trim()] = vals[1].trim(); });
                    }
                    if (cssClass != null) {
                        options.cssClass = cssClass;
                    }
                }

                $el.remove();
                t._triggers.push(new tmplBlock(options));
            });
        },

        parseForeaches: function () {
            var t = this;
            //Select all the foreach elements that aren't nested within another block
            var blocks = t.$el.find('[data-xt-foreach]').not(t.excludeNestedScopes);
            blocks.each(function (idx, elem) {
                var $el = $(elem);
                var bBlock = new tmplBlock({
                    el: elem,
                    type: 'foreach',
                    position: t.calculatePosition($el, t.$el),
                    expression: t.parseBinding($el.data('xt-foreach')),
                    iterator: $el.data('xt-iterator')
                });
                if ($el.is('[data-xt-onrender]')) {
                    bBlock.options.onrender = t.parseBinding($el.data('xt-onrender'));
                }
                t._logicBlocks.push(bBlock);
            });
        },

        parseIfs: function () {
            var t = this;
            var blocks = t.$el.find('[data-xt-if]').not(t.excludeNestedScopes);
            blocks.each(function (idx, elem) {
                var $el = $(elem);
                var curr = $el.next();

                var block = new tmplBlock({
                    el: elem,
                    type: 'if',
                    position: t.calculatePosition($el, t.$el),
                    branches: [],
                    defaultBranch: null
                });

                var bBlock = new tmplBlock({
                    el: $el,
                    type: 'branch',
                    expression: t.parseBinding($el.data('xt-if'))
                });
                if ($el.is('[data-xt-onrender]')) {
                    bBlock.options.onrender = t.parseBinding($el.data('xt-onrender'));
                }

                block.options.branches.push(bBlock);


                while (curr.is('[data-xt-elseif]')) {
                    bBlock = new tmplBlock({
                        el: curr,
                        type: 'branch',
                        expression: t.parseBinding($el.data('xt-elseif'))
                    });
                    if (curr.is('[data-xt-onrender]')) {
                        bBlock.options.onrender = t.parseBinding(curr.data('xt-onrender'));
                    }
                    block.options.branches.push(bBlock);
                    curr = curr.next();
                }
                if (curr.is('[data-xt-else]')) {
                    block.options.defaultBranch = new tmplBlock({
                        el: curr,
                        type: 'else'
                    });

                    if (curr.is('[data-xt-onrender]')) {
                        block.options.defaultBranch.options.onrender = t.parseBinding(curr.data('xt-onrender'));
                    }
                }

                t._logicBlocks.push(block);
            });
        },

        parseTemplates: function () {
            var t = this;
            var blocks = t.$el.find('[data-xt-template]').not(t.excludeNestedScopes);
            blocks.each(function (idx, elem) {
                var $el = $(elem);
                t._nestedTemplates.push(new tmplBlock({
                    el: elem,
                    type: 'templateref',
                    position: t.calculatePosition($el, t.$el),
                    template: $el.data('xt-template'),
                    model: t.parseBinding($el.data('xt-model'))
                }));
            });
        },

        parseAttributeBindings: function (elem) {
            var $el = $(elem);
            var t = this;

            //Handle and attribute bindings
            _.each(elem.attributes, function (attr) {
                var name = attr.name;
                //ignore attribute bindings for xintricity attributes, element ids and elements types
                //as these are not allowed. 
                if ((name.substr(0, 8) === 'data-xt-' && 'data-xt-src' !== name)
                        || name === 'id'
                        || name === 'type') { return; }

                var val = attr.value;
                val = t.parseBinding(val);
                if (_.isObject(val)) {
                    t._bindings.push({
                        expression: val,
                        type: mvvm.AttributeBinding,
                        position: t.calculatePosition($el, t.$el),
                        attr: name
                    });
                }
            });
        },

        parseCssClassBindings: function (elem) {
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
                    t._bindings.push({
                        expression: val,
                        type: mvvm.CssClassBinding,
                        position: t.calculatePosition($el, t.$el),
                        cssClass: name.substr(prefix.length)
                    });
                }
            });
        },

        parseTextBindings: function (elem) {
            var t = this;
            var $el = $(elem);

            var contents = $el.contents();
            _.each(contents.filter(function () { return this.nodeType == 3; }), function (node) {
                var matches = [];
                var match = null;
                while (match = tmplBlock.textBindingPattern.exec(node.nodeValue)) { matches.push(match[0]); }

                if (matches != null && matches.length > 0) {
                    var patterns = _.uniq(matches);
                    matches = _.map(patterns, function (val) { return t.parseBinding(val); });
                    var tblock = node.nodeValue;
                    tblock = tblock.replace(/\{/, '&#123;').replace(/\}/, '&#125;');
                    var pattern = node.nodeValue.replace(tmplBlock.textBindingPattern, function (val) {
                        return '{' + _.indexOf(patterns, val) + '}';
                    });

                    t._bindings.push({
                        type: mvvm.TextNodeBinding,
                        paths: matches,
                        pattern: pattern,
                        position: t.calculatePosition($(node), t.$el)
                    });
                }
            });
        },

        parseSelectBindings: function (elem) {
            var t = this, val;
            var blocks = t.$el.find('select[data-xt-options]').not(t.excludeNestedScopes);
            blocks.each(function (idx, elem) {
                var $el = $(elem);
                val = $el.data('xt-options');
                var binding = {
                    el: elem,
                    type: mvvm.SelectBinding,
                    path: val.substr(2, val.length - 4),
                    position: t.calculatePosition($el, t.$el)
                };

                var textField = $el.data('xt-text-field');
                var valueField = $el.data('xt-value-field');
                if (undefined !== textField && null !== textField) {
                    binding.textField = textField;
                }
                if (undefined !== valueField && null !== valueField) {
                    binding.valueField = valueField;
                }

                t._bindings.push(binding);
            });
        },

        parseBinding: function (modelRef, allowComplex) {
            var binding = {},
                matches,
            //Corresponds to syntax like {{model.SomeProperty}}
                basicPatt = /^\{\{([\w\.\[\]]+)\}\}$/i,
            //Corresponds to syntax like {{Path='model.SomeProperty', Transform='model.SomeFunction'}}
                advPatt = /^\{\{(?:\s*(Path|Transform|Pattern|HTML)\s*=\s*(?:'([^']*)'|"([^"]*)")\s*\,?)+\}\}$/ig,
                advPatt2 = /(Path|Transform|Pattern|HTML)\s*=\s*('[^']*'|"[^"]*")\s*/ig

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
            return binding;
        },

        createInstance: function (context) {
            var t = this, inst;
            if (t.options.type !== 'template') {
                throw 'Invalid object type';
            }
            return new TemplateBlockInst({
                block: t
            });
        },

        calculatePosition: function (child, parent) {
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
        }
    });

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

    tmplBlockInst.extend = extend;
    $x.extend(tmplBlockInst.prototype, {

        defaults: {
            block: null,
            context: null,
            el: null
        },
        initialize: function () {
            var t = this;
            t._bindings = [];
            t._triggers = [];
            t._logicBlocks = [];
            t._nestedTemplates = [];
            _.bindAll(t, 'render');
        },
        render: function () { },

        renderInternal: function (block, el, context) {
            var t = this, block = block ? block : this.options.block;

            var $el = $(el);

            _.each(block._triggers, function (val, idx) {
                var trigType = val.options.type;
                var options = $x.extend({}, val.options);
                options.el = t.resolveElement($el, val.options.position);
                options.context = context;
                delete options.type;
                delete options.position;
                t._triggers.push(new trigType(options));
            });

            _.each(block._logicBlocks, function (val, idx) {
                var replace = t.resolveElement($el, val.options.position);
                var item;
                switch (val.options.type) {
                    case 'if':
                        item = new IfBlockInst({
                            block: val,
                            context: context,
                            el: replace
                        });
                        break;
                    case 'foreach':
                        item = new ForeachBlockInst({
                            block: val,
                            context: context,
                            el: replace
                        });
                        break;
                    default:
                        throw 'Unknown logic block';
                }
                t._logicBlocks.push(item);
                item.render();
            });

            _.each(block._bindings, function (val, idx) {
                var target = t.resolveElement($el, val.position);
                var options = $x.extend({}, val, {
                    model: context,
                    el: target
                });
                delete options.position;
                var item = new val.type(options);
                t._bindings.push(item);
            });

            _.each(block._nestedTemplates, function (val, idx) {
                var target = t.resolveElement($el, val.options.position);
                var item = new ChildTemplateBlockInst({
                    block: val,
                    context: context,
                    el: target
                });
                t._nestedTemplates.push(item);
                item.render();
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
            _.each(t._bindings, function (item) { item.dispose(); });
            t._bindings = [];
            _.each(t._triggers, function (item) { item.dispose(); });
            t._triggers = [];
            _.each(t._logicBlocks, function (item) { item.dispose(); });
            t._logicBlocks = [];
            _.each(t._nestedTemplates, function (item) { item.dispose(); });
            t._nestedTemplates = [];
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
                context.createField(key, { type: value.constructor });
            });
            return context;
        }

    });
    $x.extend(tmplBlockInst.prototype, modelTraversalUtils);

    var TemplateBlockInst = tmplBlockInst.extend({
        initialize: function () {
            tmplBlockInst.prototype.initialize.apply(this);
            _.bindAll(this, 'render');
        },

        render: function () {
            var t = this;
            var block = t.options.block;
            t.setEl($(block.el).clone());
            var context = t.createContext({ model: t.options.context });
            t.renderInternal(block, t.$el, context);
            t.$el.removeClass('xt-template');
        }
    });

    var ChildTemplateBlockInst = tmplBlockInst.extend({
        initialize: function () {
            var t = this;
            tmplBlockInst.prototype.initialize.apply(this);
            _.bindAll(t, 'modelChanged', 'render');
            var mod = t.options.block.options.model;
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
            $x.template(block.options.template)('destroy', t.$el);
            var rplc = $x.template(block.options.template)(t.model);
            t.$el.replaceWith(rplc);
            t.setEl(rplc);
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
            _.each(block.options.branches, function (val, idx) {
                var branch = {};
                branch.callback = _.bind(t.modelChanged, t, idx);
                branch.value = t.resolveModelExpressionValue(t.options.context, val.options.expression);

                if (t.current === null && branch.value) { t.current = idx; };
                t.bindModelExpression(t.options.context, val.options.expression, branch.callback);
                t.branches.push(branch);
            });
        },
        modelChanged: function (idx) {
            var t = this;
            var block = t.options.block;
            var bbranch = block.options.branches[idx];
            var branch = t.branches[idx];
            var curr = branch.value;

            //Changing val to bbranch, must have changed it during some refactoring
            branch.value = t.resolveModelExpressionValue(t.options.context, bbranch.options.expression);
            if ((t.current === null || idx <= t.current) && branch.value != curr) {
                var next = null;
                for (var i = 0; i < t.branches.length; i++) {
                    if (this.branches[i].value) {
                        next = i;
                        break;
                    }
                }
                if (next === null && block.options.defaultBranch !== null) {
                    next = t.branches.length;
                }
                t.current = next;
                t.render();
            }



        },
        render: function () {
            var t = this;
            var opts = t.options.block.options;
            var block = (t.current !== null && t.current < t.branches.length) ? opts.branches[t.current] : opts.defaultBranch;
            t.clear();

            var $next = null;
            if (block) {
                var $next = $(block.options.el).clone();
                //Clean up the HTML
                $next.removeAttr('data-xt-if');
                t.renderInternal(block, $next, t.options.context);
            } else {
                $next = createPlaceholderNode();
            }
            //Ensure we keep the same number of HTML nodes as the template by creating placeholder text
            //nodes to stand in for all the branches not taken
            for (var i = 0; i < t.branches.length - 1; i++) {
                $next = $next.add(createPlaceholderNode());
            }
            if (opts.defaultBranch !== null) {
                $next = $next.add(createPlaceholderNode());
            }

            if (t.$el.eq(0).prev().length) {
                $next.insertBefore(t.$el.eq(0));
            } else {
                t.$el.eq(0).parent().prepend($next);
            }
            t.$el.remove();
            t.setEl($next);

            if (_.has(block.options, 'onrender')) {
                var action = t.resolveModelExpression(t.options.context, block.options.onrender);
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
            var mod = t.options.block.options.expression;
            _.bindAll(t, 'render', 'modelChanged');

            t.bindModelExpression(t.options.context, mod, t.modelChanged);
            t.value = t.resolveModelExpressionValue(t.options.context, mod);
        },
        modelChanged: function (event) {
            var t = this;
            var mod = t.options.block.options.expression;
            //t.unbindModelExpression(t.options.context, mod, t.modelChanged);
            //t.bindModelExpression(t.options.context, mod, t.modelChanged);
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
            if (t.value && t.value.length > 0) {
                var iterName = block.options.iterator;
                var innerElem = block.$el.clone().children();

                //Clean up the HTML
                t.$el.removeAttr('data-xt-foreach');
                t.$el.removeAttr('data-xt-iterator');
                var rerender = function (elem, idx, list) {

                    //var iterVal = _.last(t.resolveModelPath(elem, t.options.block.options.expression, {allowPartial: false}));
                    var attrs = {};
                    attrs[iterName] = elem; //iterVal;
                    var context = t.createContext(attrs, t.options.context);

                    var rplc = $(block.el).clone();
                    t.renderInternal(t.options.block, rplc, context);
                    t.$el.append(rplc.children());
                }

                //Just in case the property is not a Backbone collection
                if (t.value instanceof Backbone.Collection) {
                    t.value.forEach(rerender);
                } else {
                    _.each(t.value, rerender);
                }
            }

            if (_.has(block.options, 'onrender')) {
                var action = t.resolveModelExpression(t.options.context, block.options.onrender);
                if (_.isArray(action) && action.length > 0) {
                    action = _.last(action);
                    action($next);
                }
            }
        }
    });

    var templateInstances = {};
    mvvm.Template = function (block, model) {
        var t = this;
        t.block = block;
        t.model = model;
        t.tmplID = Math.floor(Math.random() * 100000000);
        templateInstances[t.tmplID] = this;
    };

    $x.extend(mvvm.Template.prototype, {
        render: function () {
            var t = this;
            var inst = new TemplateBlockInst({
                block: t.block,
                context: t.model
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
        var block = new tmplBlock({ el: el });
        if (arguments.length === 2 && arguments[1] === true) { return block; }

        var handleCommand = function () {
            if (arguments.length === 1) {
                var tmpl = new mvvm.Template(block, arguments[0]);
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
} (jQuery, _, XUtil));

