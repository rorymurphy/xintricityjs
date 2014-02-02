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
            return (root.XMVVM = factory($, _, $x, mvvm, __XBase__));
        });
    } else {
        // Browser globals
        root.XMVVM = factory(root.jQuery, root._, root.XUtil, root.XMVVM, root.__XBase__);
    }
}(this, function ($, _, $x, mvvm, XBase) {
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
            if(child === parent){ return []; }

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
            return binding;
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
        selector: '[data-xt-if],[data-xt-elseif],[data-xt-else]',
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
                    var cond = curr.is('[data-xt-if]')?curr.data('xt-if'):curr.data('xt-elseif');
                    bBlock = new templateNode({
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
                }while (curr.is('[data-xt-elseif]'));

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
            var item = new TemplateBlockInst({
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
                if ((name.substr(0, 8) === 'data-xt-' && 'data-xt-src' !== name)
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
                el: $el,
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
                el: $el,
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
            _.each(contents.filter(function () { return this.nodeType == 3; }), function (txtnode) {
                var matches = [];
                var match = null;
                while (match = textBindingNodeType.textBindingPattern.exec(txtnode.nodeValue)) { matches.push(match[0]); }

                if (matches != null && matches.length > 0) {
                    var patterns = _.uniq(matches);
                    matches = _.map(patterns, function (val) { return t.parseBinding(val); });
                    var tblock = txtnode.nodeValue;
                    tblock = tblock.replace(/\{/, '&#123;').replace(/\}/, '&#125;');
                    var pattern = txtnode.nodeValue.replace(textBindingNodeType.textBindingPattern, function (val) {
                        return '{' + _.indexOf(patterns, val) + '}';
                    });

                    node.childNodes.push(new templateNode({
                        type: textBindingNodeType,
                        paths: matches,
                        pattern: pattern,
                        position: t.calculatePosition($(txtnode), node.$el)
                    }));
                }
            });        
        },
        createInstance: function(node, $el, context){
            var target = resolveElement($el, node.position);
            var item = new mvvm.TextNodeBinding({
                model: context,
                el: $el,
                paths: node.paths,
                pattern: node.pattern
            });
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
            val = $el.data('xt-options');
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
                el: $el,
                path: node.path,
                textField: node.textField,
                valueField: node.valueField
            });
            return item;
        }
    };

    mvvm.NodeTypes.push(selectBindingNodeType);
    return mvvm;
}));