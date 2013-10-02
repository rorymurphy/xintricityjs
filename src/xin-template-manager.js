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
