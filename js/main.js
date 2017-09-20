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
        var target    = board.solution[Math.floor(index/9)][index%9];
        var number    = $cell.find('input').val();
        var complete  = false;

        $cell.empty().removeClass('empty').removeClass('solved').attr('style', null);

        if (number == target) {
            $cell.text(number).addClass('solved');
            counters[number]++;
            highlightCells(number);
            updateLegend();

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

            //showMenu();
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

    function updateLegend() {
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

    function startLoadingPuzzle() {
        setGameStateClass('running');

        var hardPuzzle = [
            [0, 0, 3, 0, 0, 8, 0, 0, 0],
            [0, 4, 0, 0, 0, 0, 0, 0, 0],
            [0, 8, 0, 3, 5, 0, 9, 0, 0],
            [8, 0, 5, 0, 0, 6, 0, 0, 0],
            [1, 0, 0, 7, 3, 2, 0, 0, 8],
            [0, 0, 0, 8, 0, 0, 3, 0, 1],
            [0, 0, 8, 0, 1, 4, 0, 7, 0],
            [0, 0, 0, 0, 0, 0, 0, 5, 0],
            [0, 0, 0, 9, 0, 0, 2, 0, 0]
        ];

        var puzzle = generatePuzzle();

        board = {puzzle:puzzle};

        setTimeout(function () {
            board.solution = solveSudoku(puzzle, {});
        }, 1);

        initializeBoard(board);
    }
    
    function initializeBoard(board) {
        var puzzle = board.puzzle;

        $game.removeClass('complete');

        // populate cells
        counters = {'1':0,'2':0,'3':0,'4':0,'5':0,'6':0,'7':0,'8':0,'9':0};

        for (var i = 0; i < puzzle.length; i++) {
            for (var j = 0; j < puzzle[i].length; j++) {
                var $cell      = $boardCells.eq(i*9+j);

                var number     = puzzle[i][j] ? puzzle[i][j] : '';
                var cellStates = ['empty', 'solved', 'highlighted'];
                var cellState  = number == '' ? 'empty' : 'solved init';

                $cell.text(number).removeClass(cellStates.join(' ')).addClass(cellState);

                if (number != '') {
                    counters[number]++;
                }
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

        updateLegend();
    }

    function initializeApp() {
        $legendCells.each(function(idx, cell) {
            var $cell  = $(cell);

            $cell.addClass('disabled');
        });

        setGameStateClass('clean');

        startLoadingPuzzle();
    }

    initializeApp();
});