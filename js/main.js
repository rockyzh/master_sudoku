$(function() {
    var undefined;
    var $game            = $('.game');
    var $menu            = $game.find('.menu');
    var $board           = $game.find('.board');
    var $legend          = $game.find('.legend');
    var $boardCells      = $board.find('.cell');
    var $legendCells     = $legend.find('.cell');
    var $selected        = $([]);
    var board            = null;
    var highlighted      = null;
    var counters         = null;
    var templates        = null;
    var gameLoaderHandle = null;

    $(document.body).bind('click', function() {
        if ($selected.length > 0) {
            closeCellInput($selected);
        }

        if ($selected.length > 0) {
            closeCellInput($selected);
        }
    });

    $board.delegate('.cell.empty', 'click', function(e) {
        if ($game.hasClass('running') == false) {
            return false;
        }

        e.preventDefault();
        e.stopPropagation();

        if ($selected.length > 0) {
            closeCellInput($selected);
        }

        $selected = $(this);
        $selected.html('<input type="text"/>').find('input').focus();

        highlightCells(null);
        
        return;
    });

    $board.delegate('.cell.empty', 'keydown', function(e) {
        if ($game.hasClass('running') == false) {
            return false;
        }

        var $this = $(this);
        var $cell = $this.closest('.cell');

        e.preventDefault();
        e.stopPropagation();

        // ENTER, ESC
        if (e.keyCode == 13 || e.keyCode == 27) {
            closeCellInput($cell);

            return;
        }
        // digits between 1-9
        else if (e.keyCode >= 49 && e.keyCode <= 57) {
            var number = e.keyCode-48;
            $cell.find('input').val(number);
        }

        return;
    });
    
    $board.delegate('.cell.solved', 'click', handleHighlightTrigger);
    $legend.delegate('.cell', 'click', handleHighlightTrigger);

    $menu.delegate('.close-trigger', 'click', function(e) {
        e.preventDefault();

        cancelLoadingPuzzle();

        setGameStateClass('running');
    });

    $menu.delegate('.selector', 'click', function(e) {
        e.preventDefault();

        var $this       = $(this);
        var $group      = $this.closest('.selectors');
        var disposition = $group.attr('data-disposition');
        var property    = $group.attr('data-property');
        var config      = $menu.data('config');
        var values      = null;

        // update "selected" class
        if (disposition == 'checkboxes') {
            var classFunction = $this.hasClass('selected') ? 'removeClass' : 'addClass';
            $this[classFunction]('selected');
        }
        else {
            $group.find('.selector').removeClass('selected');
            $this.addClass('selected');
        }

        // construct values hash
        $group.find('.selector').each(function(idx, el) {
            var $el = $(el);

            if ($el.hasClass('selected')) {
                var value = $(el).attr('data-value');
                
                if (values == null) {
                    values = {};
                }

                values[value] = true;
            }
        });

        config[property] = values;
        $menu.data('config', config);

        showMenu();
    });

    $menu.delegate('.navigator', 'click', function(e) {
        e.preventDefault();

        cancelLoadingPuzzle();

        var $this  = $(this);
        var config = $menu.data('config');
        var target = $this.attr('data-target');
        var source = $this.attr('data-source');
        
        delete config[target];
        delete config[source];

        $menu.data('config', config);

        showMenu();
    });

    $game.delegate('.menu-trigger', 'click', function(e) {
        e.preventDefault();

        setGameStateClass('paused');

        $menu.data('config', {});
        $menu.data('state', 'reset');
        $menu.data('salutation', 'new game');
        showMenu();
    });

    function handleHighlightTrigger(e) {
        if ($game.hasClass('running') == false) {
            return false;
        }

        e.preventDefault();

        if ($selected.length > 0) {
            closeCellInput($selected);
        }

        var $this  = $(this);
        var number = $this.text();

        $selected.empty();
        $selected = $([]);

        highlightCells(number);

        return;
    }

    function closeCellInput($cell) {
        var index     = $boardCells.index($cell);
        var target    = board.solution[index]+1;
        var number    = $cell.find('input').val();
        var complete  = false;

        $cell.empty().removeClass('empty').removeClass('solved').attr('style', null);

        if (number == target) {
            $cell.text(number).addClass('solved');
            counters[number]++;
            highlightCells(number);
            udpateLegend();

            complete = checkComplete();
        }
        else if (number != '') {
            var cell      = $cell[0];
            var animator  = new Animator({duration:750});
            var animation = new ColorStyleSubject(cell, "background-color", "#FF8888", "#FFFFFF");

            $cell.text('').addClass('empty');
            animator.addSubject(animation).play();
        }
        else {
            $cell.text('').addClass('empty');
        }

        $selected = $([]);

        if (complete) {
            highlightCells(null);
            setGameStateClass('complete');

            $menu.data('config', {});
            $menu.data('state', 'complete-singleplayer');
            $menu.data('salutation', 'well done!');
            showMenu();
        }
    }

    function highlightCells(number) {
        for (var i = 0; i < $boardCells.length; i++) {
            var $cell = $boardCells.eq(i);

            if (number && $cell.text() == number) {
                $cell.addClass('highlighted');
            }
            else {
                $cell.removeClass('highlighted');
            }
        }

        highlighted = number;
    }

    function udpateLegend() {
        $legendCells.each(function(idx, cell) {
            var $cell  = $(cell);
            var number = idx+1;

            if (counters[number] < 9) {
                $cell.removeClass('disabled');
            }
            else {
                $cell.addClass('disabled');
            }
        });
    }

    function checkComplete() {
        for (var i = 0; i < board.solution.length; i++) {
            var target = board.solution[i]+1;
            var number = $boardCells.eq(i).text();

            if (number != target) {
                return false;
            }
        }

        return true;
    }

    function setGameStateClass(classes) {
        var gameStates = ['clean', 'complete', 'paused', 'running'];

        $game.
            removeClass(gameStates.join(' ')).
            addClass(classes);
    }

    function setGameConfigClasses(classes) {
        var configStates = ['singleplayer', 'multiplayer', 'easy', 'medium', 'hard'];

        $game.
            removeClass(configStates.join(' ')).
            addClass(classes);
    }

    function parseTemplates() {
        var templates = {};

        $('script.template').each(function(idx, el) {
            var $this = $(el);
            var text  = $this.text();
            var id    = $this.attr('id');

            templates[id] = _.template(text);
        });

        return templates;
    }

    function populateSelectors(defaults, values) {
        var result = [];

        for (var i = 0; i < defaults.length; i++) {
            var original = defaults[i];
            var clone    = _.clone(original);
            var value    = clone.value;

            clone.selected = !!values[value];

            result.push(clone);
        }

        return result;
    }

    var startLoadingPuzzleWithDelay = _.debounce(function() {
        var config = $menu.data('config');

        if (config.player_mode && config.player_mode.multiplayer == true && config.difficulty) {
            alert('not yet');
            //startLoadingPuzzle(config);
        }
    }, 3000);

    function showMenu() {
        var config     = $menu.data('config');
        var state      = $menu.data('state');
        var salutation = $menu.data('salutation');

        cancelLoadingPuzzle();
        showMenuContainer(salutation);

        var $widget  = $menu.find('.widget');
        var $content = $widget.find('.content');

        if ($game.hasClass('paused') && !config.cancel_confirm) {
            var defaults   = [
                {name:'No', value:'no', selected:false},
                {name:'Yes', value:'yes', selected:false}
            ];

            var data = {config:config, selectors:defaults};
            showMenuContent('template_menu_selector_cancel_confirm', data);
        }
        else if ($game.hasClass('paused') && config.cancel_confirm && config.cancel_confirm.no) {
            setGameStateClass('running');
            return;
        }
        else if (!config.player_mode) {
            var defaults   = [
                {name:'Singleplayer', value:'singleplayer', selected:false},
                {name:'Multiplayer', value:'multiplayer', selected:false}
            ];

            var data = {config:config, selectors:defaults};
            showMenuContent('template_menu_selector_player_mode', data);
        }
        else {
            var defaults   = [
                {name:'Easy', value:'easy', selected:false},
                {name:'Medium', value:'medium', selected:false},
                {name:'Hard', value:'hard', selected:false}
            ];

            var selectors = populateSelectors(defaults, config.difficulty||{});
            var data      = {config:config, selectors:selectors};
            showMenuContent('template_menu_selector_difficulty', data);
        }

        if (config.player_mode && config.player_mode.singleplayer && config.difficulty) {
            startLoadingPuzzle(config);
        }
        else {
            startLoadingPuzzleWithDelay();
        }
    }

    function showMenuContainer() {
        var salutation = $menu.data('salutation');
        var template   = templates['template_menu_container'];
        var html       = template({salutation:salutation});

        $menu.html(html);
    }

    function showMenuContent(templateName, data) {
        var state    = $menu.data('state');
        var $widget  = $menu.find('.widget');
        var $content = $widget.find('.content');
        var template = templates[templateName];
        var html     = template(data);

        $widget.addClass(state);
        $content.html(html);
    }

    function cancelLoadingPuzzle() {
        gameLoaderHandle && gameLoaderHandle.abort();
        gameLoaderHandle = null;
        $game.removeClass('loading');
    }

    function startLoadingPuzzle(config) {
        $game.addClass('loading');
        
        var difficulty = _.keys(config.difficulty)[0];
        var mode       = _.keys(config.player_mode)[0];
        
        gameLoaderHandle = $.ajax({
            url: '/sudoku/api/v1/board',
            type: 'GET',
            success: function(data, status, ajax) {
                gameLoaderHandle = null;
                
                // TODO: implemente error handling
                if (!data || !data.payload) {
                    console.log('ahtung, ahtung, grave error');
                    return;
                }
                
                board = data.payload;
                
                $game.removeClass('loading');
                setGameStateClass('running');
                setGameConfigClasses([mode, difficulty].join(' '));
                initializeBoard(board);
                
                console.log(difficulty, mode, board.difficulty);
            },
            error: function() {
                gameLoaderHandle = null;
                
                // TODO: implement
                console.log('ahtung, ahtung, grave error');
            }
        });
    }
    
    function initializeBoard(board) {
        var puzzle = board.puzzle;

        $game.removeClass('complete');

        // populate cells
        counters = {'1':0,'2':0,'3':0,'4':0,'5':0,'6':0,'7':0,'8':0,'9':0};
        for (var i = 0; i < $boardCells.length; i++) {
            var $cell      = $boardCells.eq(i);
            var number     = puzzle[i] == null ? '' : puzzle[i]+1;
            var cellStates = ['empty', 'solved', 'highlighted'];
            var cellState  = number == '' ? 'empty' : 'solved';
            
            $cell.text(number).removeClass(cellStates.join(' ')).addClass(cellState);

            if (number != '') {
                counters[number]++;
            }
        }

        // highlight the first number
        highlighted = null;
        for (var i = 0; i < $boardCells.length; i++) {
            var $cell = $boardCells.eq(i);
            var text  = $cell.text();

            if (text != '') {
                $cell.click();
                break;
            }
        }

        udpateLegend();
    }

    function initializeApp() {
        $legendCells.each(function(idx, cell) {
            var $cell  = $(cell);

            $cell.addClass('disabled');
        });
        
        templates = parseTemplates();

        setGameStateClass('clean');

        $menu.data('config', {});
        $menu.data('state', 'normal');
        $menu.data('salutation', 'wecome');
        showMenu();
    }

    initializeApp();
});