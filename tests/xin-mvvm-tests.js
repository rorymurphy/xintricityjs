(function ($) {
    var mvvm = $x.namespace('$xintricity.MVVM');

    test('Two-way Attribute Binding Test', function () {

        var modClass1 = mvvm.Model.extend({
            fields: {
                'Property1': { type: String }
            }
        });

        var modClass2 = mvvm.Model.extend({
            fields: {
                'Property2': { type: modClass1 }
            }
        });

        var model = new modClass2();
        model.Property2(new modClass1());
        model.Property2().Property1('Initial Value');
        var $el = $('#xin-mvvm-attributebinding-test > input[name="testval"]');

        var binding = new mvvm.AttributeBinding({
            model: model,
            expression: {path: 'Property2.Property1'},
            el: $el,
            attr: 'value'
        });

        model.Property2().Property1('Second Value');
        console.log($el.val());
        console.log(model.Property2().Property1());
        equal($el.val(), 'Second Value', "Attribute Value Change Succeeded!");

        $el.on('change', function () { console.log('Change event'); });
        $el.val('Third Value').trigger('change');
        console.log($el.val());
        console.log(model.Property2().Property1());
        equal(model.Property2().Property1(), 'Third Value', 'Element Value Change Succeeded!');
    });

    test('Text Node Binding Test', function () {
        var modClass1 = mvvm.Model.extend({
            fields: {
                'Property1': { type: String }
            }
        });

        var model1 = new modClass1();
        model1.Property1('failure');
        var el = $('#xin-mvvm-textnodebinding-test').contents().get(0);
        equal(el.nodeType, 3, 'Verifying that it is a text node');
        equal(el.nodeValue, 'This is a {{Property1}}', 'Verifying Initial Contents');

        var bind = new mvvm.TextNodeBinding({
            model: model1,
            paths: [{path: 'Property1'}],
            el: el,
            pattern: 'This is a {0}'
        });

        model1.Property1('first try');
        equal(el.nodeValue, 'This is a first try', 'Verifying Bound Contents');
    });

    test('DOM Event Binding Test', function () {
        var $el = $('#xin-mvvm-eventtrigger-test > button');
        var trigger = new mvvm.StyleTrigger({
            el: $el[0],
            event: 'click',
            cssClass: 'test-class',
            styles: {
                display: 'block',
                height: '1234px'
            }
        });

        equal($el.hasClass('test-class'), false, 'Verifying class is not already set');
        $el.trigger('click');
        equal($el.hasClass('test-class'), true, 'Event Trigger CssClass Fired!');
        equal($el.css('height'), '1234px', 'Event Trigger Style Fired!');
    });

    test('Parse MVVM Template', function () {
        var $el = $('#xin-mvvm-template-test');
        var tmpl = mvvm.Template.compile($el.get(0), true);
        equal(tmpl._nestedTemplates.length, 0, "No false positives");
        //equal(tmpl._bindings.length, 0, "No false positives");

        var sb = _.filter(tmpl._bindings, function(val) { return val.type === mvvm.SelectBinding; });
        equal(sb.length, 1, 'Verifying select binding was parsed');

        equal(tmpl._logicBlocks.length, 1, "Parse top level foreach");
        var fe = tmpl._logicBlocks[0];
        equal(fe.options.type, 'foreach', 'Ensuring outer foreach');
        equal(fe.options.expression.path, 'model.Albums', 'Check outer foreach expression');
        equal(fe.options.iterator, 'album', 'Check outer foreach iterator');

        var ifb = _.find(fe._logicBlocks, function (val) { return val.options.type === 'if'; });
        notEqual(ifb, null, "Inner if block not null");
        equal(ifb.options.branches[0].options.expression.path, 'album.IsFavorite', 'Check if block expression');

        var ife = _.find(fe._logicBlocks, function (val) { return val.options.type === 'foreach'; });
        notEqual(ife, null, "Inner foreach block not null");
        notEqual(tmpl, null);
    });

    test('Render MVVM Template Instance', function () {
        var $el = $('#xin-mvvm-template-test');
        var tmpl = mvvm.Template.compile($el.get(0));
        notEqual(tmpl, null);

        var model = new musicCollection({
            Title: "Rory's Music",
            Slug: 'rorys-music',
            TestNum: Math.ceil(Math.random() * 1000),
            Albums: [
                {
                    Title: "A Hard Day's Night",
                    Slug: 'a-hard-days-night',
                    IsFavorite: false,
                    Songs: [
                        {
                            Title: "A Hard Day's Night",
                            Artist: "The Beatles"
                        },
                        {
                            Title: "If I Fell in Love",
                            Artist: "Paul McCartney",
                        },
                        {
                            Title: "Can't Buy Me Love",
                            Artist: "John Lennon"
                        }
                    ]
                },
                {
                    Title: "Superunknown",
                    Slug: 'superunknown',
                    IsFavorite: true,
                    Songs: [
                        {
                            Title: "Spoon Man",
                            Artist: "Sound Garden"
                        },
                        {
                            Title: "Black Hole Sun",
                            Artist: "Sound Garden"
                        }
                    ]
                }
            ]
        }, {parse: true});
        model.Albums().at(0).on('change:Slug', function(){
            console.log('changed');
        });
        var inst = $('<div></div>').append(tmpl(model)) ;

        equal(inst.find('.songs table tbody tr:first-child td').eq(2).text().trim() , "A Hard Day's Night", 'Verifying text binding');

        equal(inst.find('select option').length, 2, 'Verifying select binding rendered options');
        var opt=inst.find('select option:first-child');
        equal(opt.text(), "A Hard Day's Night", 'Verifying option text');
        equal(opt.val(), 'a-hard-days-night', 'Verifying option value');

        equal(inst.find('ul li').length, 2, 'Verifying outer foreach count');
        equal(inst.find('ul li:first-child table tbody tr').length, 3, 'Verifying inner foreach count');
        var clickEl = inst.find('tr').eq(0).find('td:last-child');
        notEqual(clickEl.hasClass('clicked'), true);
        clickEl.click();
        equal(clickEl.hasClass('clicked'), true, 'Verifying style trigger fired');

        equal(inst.find('ul li:first-child h5').text(), 'This album sucks', 'Verifying if-else ELSE behavior');
        equal(inst.find('ul li').eq(1).children('h5').text(), 'Marked as Favorite', 'Verifying if-else IF behavior');

        model.Albums().at(0).Songs().add(new song({
            Title: "Help",
            Artist: "The Beatles"
        }, {parse: true}));

        model.Albums().add(new album({
            Title: "Hot Licks",
            Slug: "hot-licks",
            IsFavorite: 'false',
            Songs: [
                {
                    Title: "Ruby Tuesday",
                    Artist: "The Rolling Stones"
                }
            ]
        }, {parse: true}));
        equal(inst.find('select option').length, 3, 'Verifying select binding updated options');
        opt=inst.find('select option:last-child');
        equal(opt.text(), "Hot Licks", 'Verifying option text');
        equal(opt.val(), "hot-licks", 'Verifying option value');

        equal(inst.find('ul li:first-child table tbody tr').length, 4, 'Verifying inner foreach element added');
        notEqual(inst, null);
    });

    var song = mvvm.Model.extend({
        fields: {
            Artist: { type: String },
            Title: { type: String }
        },

        initialize: function () {
            this.Play = _.bind(this.Play, this);
        },

        Play: function () {
            console.log('Playing song ' + this.Title());
        }
    });

    var songCollection = mvvm.Collection.extend({
        model: song
    });

    var album = mvvm.Model.extend({
        fields: {
            Title: { type: String },
            Slug: { type: String},
            Songs: { type: songCollection },
            IsFavorite: { type: Boolean }
        }
    });

    var albumCollection = mvvm.Collection.extend({
        model: album
    });

    var musicCollection = mvvm.Model.extend({
        fields: {
            Title: { type: String },
            Albums: { type: albumCollection },
            TestNum: { type: Number },
        },

        getTime: function(){
            return new Date().toString();
        }
    });
} (jQuery));