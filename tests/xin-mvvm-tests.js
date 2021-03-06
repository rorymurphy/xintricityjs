﻿(function ($) {
    var mvvm = XMVVM;

/*******************************************************************
First a few classes that will be used throughout the various tests
********************************************************************/
var song = XTest.song;
var songCollection = XTest.songCollection;
var album = XTest.album;
var albumCollection = XTest.albumCollection;
var musicCollection = XTest.musicCollection

var person = XTest.person;
var personCollection = XTest.personCollection;
var organization = XTest.organization;
var orgCollection = XTest.orgCollection;
/*******************************************************************
Let the tests begin
********************************************************************/

    test('Test Field Change Events', function(){
       var data = new albumCollection(musicLibrary, { parse: true });
      
       var inst = data.at(0);
       
       equal(inst.Artist(), "The Beatles", "Testing getting a field");
       equal(inst.Title(), "A Hard Day's Night", "Testing getting a field");
       
       var changeVal =0;
       //Ensure we're getting change events
       inst.once('change:Title', function(evt){ changeVal = true; } );
       inst.Title("Success!");
       equal(changeVal, true, 'test listening for a property change');
       
       changeVal = false;
       inst.on('change', function(evt){ changeVal = true; });
       //Should not trigger the change due, since we aren't listening to bubbled events
       inst.Songs().at(0).Title('changed');
       equal(changeVal, false, 'ensure bubbled events are note being handled unless specified');
       inst.off('change');
       inst.on('change', function(evt){ changeVal = true; }, undefined, true);
       inst.Songs().at(0).Title('changed again');
       equal(changeVal, true, 'now testing that bubbled events get triggered when specified');
    });

    test('Two-way Attribute Binding Test', function () {
        var model = new organization(orgHierarchyData, { parse: true });
        var $el = $('#xin-mvvm-attributebinding-test > input[name="testval"]');

        var binding = new mvvm.AttributeBinding({
             model: model,
             expression: {path: 'Boss.Name'},
             el: $el,
             attr: 'value'
        });

        model.Boss().Name('Second Value');
        console.log($el.val());
        console.log(model.Boss().Name());
        equal($el.val(), 'Second Value', "Attribute Value Change Succeeded!");

        $el.on('change', function () { console.log('Change event'); });
        $el.val('Third Value').trigger('change');
        console.log($el.val());
        console.log(model.Boss().Name());
        equal(model.Boss().Name(), 'Third Value', 'Element Value Change Succeeded!');
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
        model1.Property1('second & try');
        equal(el.nodeValue, 'This is a second & try', 'Verifying Bound Contents');
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

//    test('Parse MVVM Template', function () {
//        var $el = $('#xin-mvvm-template-test');
//        var tmpl = mvvm.Template.compile($el.get(0), true);
//        equal(tmpl._nestedTemplates.length, 0, "No false positives");
//        //equal(tmpl._bindings.length, 0, "No false positives");
//
//        var sb = _.filter(tmpl._bindings, function(val) { return val.type === mvvm.SelectBinding; });
//        equal(sb.length, 1, 'Verifying select binding was parsed');
//
//        equal(tmpl._logicBlocks.length, 1, "Parse top level foreach");
//        var fe = tmpl._logicBlocks[0];
//        equal(fe.options.type, 'foreach', 'Ensuring outer foreach');
//        equal(fe.options.expression.path, 'model.Albums', 'Check outer foreach expression');
//        equal(fe.options.iterator, 'album', 'Check outer foreach iterator');
//
//        var ifb = _.find(fe._logicBlocks, function (val) { return val.options.type === 'if'; });
//        notEqual(ifb, null, "Inner if block not null");
//        equal(ifb.options.branches[0].options.expression.path, 'album.IsFavorite', 'Check if block expression');
//
//        var ife = _.find(fe._logicBlocks, function (val) { return val.options.type === 'foreach'; });
//        notEqual(ife, null, "Inner foreach block not null");
//        notEqual(tmpl, null);
//    });

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
                    Artist: 'The Beatles',
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
        equal(inst.find('ul li:first-child').data('name'), 'This is a-hard-days-night by The Beatles', 'Testing attribute text pattern binding.');

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

    test('Test built in Filters object', function(){
        var model = new organization(orgHierarchyData, { parse: true });
        var $el = $('#xin-mvvm-attributebinding-test > input[name="testval"]');
        $el.val();
        var binding = new mvvm.AttributeBinding({
             model: model,
             expression: {path: 'Boss.Name', filter: 'Filter.isEmpty'},
             el: $el,
             attr: 'value'
        });

        model.Boss().Name('');
        console.log($el.val());
        console.log(model.Boss().Name());
        equal($el.val(), 'true', "Attribute Value Change Succeeded!");

        $el.on('change', function () { console.log('Change event'); });
        $el.val('Third Value').trigger('change');
        console.log($el.val());
        console.log(model.Boss().Name());
        equal(model.Boss().Name(), 'Third Value', 'Element Value Change Succeeded!');      
    });
    
    test('Test radio button binding', function(){
        var model = new album({
           Year: 1985
        });
        
        var vmClass = mvvm.ViewModel.extend({
           view: 'xin-mvvm-radiobinding-test' 
        });
        var vm = new vmClass({
           model: model 
        });
        
        var $el = vm.render();
        equal(1, $el.find('input[value="1985"]:checked').length);
        model.Year(1975);
        equal(0, $el.find('input[value="1985"]:checked').length);
        equal(1, $el.find('input[value="1975"]:checked').length);
    });
} (jQuery));