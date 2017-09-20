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

    $(document.body).bind('click', function() {
        if ($selected.length > 0) {
            closeCellInput($selected);
        }

        if ($selected.length > 0) {
            closeCellInput($selected);
        }
    });

    $game.delegate('.menu-trigger', 'click', function(e) {
        e.preventDefault();

        setGameStateClass('paused');

        $menu.data('config', {});
        $menu.data('state', 'reset');
        $menu.data('salutation', 'new game');

        showMenu();
    });

    $menu.delegate('#newGameButton', 'click', function(e) {
        e.preventDefault();

        startLoadingPuzzle();
    });

    var currentErrors = [];

    function clearErrors() {
        var noErrorsSpan = document.getElementById('noErrors');
        var errorsFoundSpan = document.getElementById('errorsFound');

        errorsFoundSpan.style.display = 'none';
        noErrorsSpan.style.display = 'none';

        for(var i = 0; i < currentErrors.length; i++) {
            currentErrors[i].setAttribute('class', currentErrors[i].getAttribute('class').replace(" error", ''))
        }
        currentErrors = [];
    }

    function getCurrentBoard() {

        var board = new Array(9);

        for(var i = 0; i < 9; i++) {
            for(var j = 0; j < 9; j++) {
                if(j === 0) {
                    board[i] = new Array(9);
                }

                var value = $($boardCells[i*9+j]).text();
                if(value.match(/^[1-9]$/)) {
                    value = parseInt(value);
                } else {
                    //TODO: prompt user for invalid chars
                    value = 0;
                }
                board[i][j] = value;
            }
        }

        return board;
    }

    $menu.delegate('#checkButton', 'click', function(e) {
        e.preventDefault();

        clearErrors();

        var noErrorsSpan = document.getElementById('noErrors');
        var errorsFoundSpan = document.getElementById('errorsFound');
        var winBlock = document.getElementById('youWon');
        var difficulty = document.getElementById('difficulty');

        var board = getCurrentBoard();
        var result = verifySolution(board);
        if(result['valid']) {

            var validMessages = [ "LOOKIN GOOD", "KEEP GOING", "AWESOME", "EXCELLENT",
                "NICE", "SWEET", "LOOKS GOOD TO ME"];

            if(verifySolution(board, true)['valid']) {
                winBlock.style.display = 'block';
            }
            else {
                var randIndex = getRandom(validMessages.length);
                noErrorsSpan.textContent = validMessages[randIndex];
                noErrorsSpan.style.display = 'block';
            }
        }
        else {
            if('badRow' in result) {
                var row = result['badRow'];
                for(var i = 0; i < 9; i++) {
                    var id = "" + row + i;
                    var el = document.getElementById(id);
                    el.setAttribute("class", el.getAttribute('class') + " error");
                    currentErrors.push(el);
                }
            }
            else if('badCol' in result) {
                var col = result['badCol'];
                for(var i = 0; i < 9; i++) {
                    var id = "" + i + col;
                    var el = document.getElementById(id);
                    el.setAttribute("class", el.getAttribute('class') + " error");
                    currentErrors.push(el);
                }
            }
            else if('badCube' in result) {
                var cubeRow = result['badCube'][0];
                var cubeCol = result['badCube'][1];
                for(var x = cubeRow + 2; x >= cubeRow; x--) {
                    for(var y = cubeCol + 2; y >= cubeCol; y--) {
                        var id = "" + x + y;
                        var el = document.getElementById(id);
                        el.setAttribute("class", el.getAttribute('class') + " error");
                        currentErrors.push(el);
                    }
                }

            }
            errorsFoundSpan.style.display = 'block';
        }
    });

    function renderSolvedBoard(solved) {
        for(var i = 0; i < 9; i++) {
            for(var j = 0; j < 9; j++) {
                board.puzzle[i][j] = solved[i][j];

                $($boardCells[i*9+j]).removeClass('empty').addClass('solved helped');
                $($boardCells[i*9+j]).text(solved[i][j]);
            }
        }
    }

    $menu.delegate('#solveButton', 'click', function(e) {
        e.preventDefault();

        clearErrors();
        renderSolvedBoard(solveSudoku(board.puzzle));
    }, false);

    $menu.delegate('.close-trigger', 'click', function(e) {
        e.preventDefault();

        setGameStateClass('running');
    });

    function showMenu() {
        var template   = templates['template_menu_container'];
        var html       = template({title:''});

        $menu.html(html);
    }

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

    function initializeApp() {
        $legendCells.each(function(idx, cell) {
            var $cell  = $(cell);

            $cell.addClass('disabled');
        });

        templates = parseTemplates();

        setGameStateClass('clean');

        startLoadingPuzzle();
    }

    initializeApp();
});