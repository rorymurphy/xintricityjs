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
