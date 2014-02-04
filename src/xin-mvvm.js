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

