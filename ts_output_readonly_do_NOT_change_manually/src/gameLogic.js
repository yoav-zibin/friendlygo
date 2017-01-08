var gameLogic;
(function (gameLogic) {
    function isEqual(object1, object2) {
        return angular.equals(object1, object2);
    }
    // returns a new [empty] weiqi board
    // code adapted from: http://stackoverflow.com/questions/6495187/best-way-to-generate-empty-2d-array
    function createNewBoardWithElement(dim, element) {
        var rows = dim;
        var cols = dim;
        var array = [], row = [];
        while (cols--)
            row.push(element);
        while (rows--)
            array.push(row.slice());
        return array;
    }
    gameLogic.createNewBoardWithElement = createNewBoardWithElement;
    function createNewBoard(dim) {
        return createNewBoardWithElement(dim, '');
    }
    gameLogic.createNewBoard = createNewBoard;
    // returns copy of JS object
    function copyObject(object) {
        return angular.copy(object);
    }
    //Helper for getSets
    function getWeb(color, row, col, board, visited) {
        var points = [];
        var dim = board.length;
        function tryPoints(row, col) {
            points.push([row, col]);
            visited[row][col] = color;
            if (row - 1 >= 0 && visited[row - 1][col] === '' && board[row - 1][col] === color) {
                tryPoints(row - 1, col);
            }
            if (row + 1 < dim && visited[row + 1][col] === '' && board[row + 1][col] === color) {
                tryPoints(row + 1, col);
            }
            if (col + 1 < dim && visited[row][col + 1] === '' && board[row][col + 1] === color) {
                tryPoints(row, col + 1);
            }
            if (col - 1 >= 0 && visited[row][col - 1] === '' && board[row][col - 1] === color) {
                tryPoints(row, col - 1);
            }
        }
        tryPoints(row, col);
        return points;
    }
    //Helper for getSets
    function mergeBoards(leader, links) {
        var dim = leader.length;
        var finalleader = copyObject(leader);
        var row, col;
        for (row = 0; row < dim; row++) {
            for (col = 0; col < dim; col++) {
                if (links[row][col] !== '') {
                    finalleader[row][col] = links[row][col];
                }
            }
        }
        return finalleader;
    }
    // needed by evaluateBoard
    // groups all contiguous stones as sets
    function getSets(board) {
        var dim = board.length;
        var visited = createNewBoard(dim);
        var setsX = []; // black sets
        var setsO = []; // white sets
        var row, col;
        for (row = 0; row < dim; row++) {
            for (col = 0; col < dim; col++) {
                if (board[row][col] === 'B' && visited[row][col] === '') {
                    setsX.push(getWeb('B', row, col, board, visited));
                }
                else if (board[row][col] === 'W' && visited[row][col] === '') {
                    setsO.push(getWeb('W', row, col, board, visited));
                }
            }
        }
        return { black: setsX, white: setsO };
    }
    gameLogic.getSets = getSets;
    // Changes all arr locations in board to '' (empty)
    function cleanBoard(board, arr) {
        var newboard = copyObject(board);
        for (var i = 0; i < arr.length; i++) {
            var row = arr[i][0];
            var col = arr[i][1];
            newboard[row][col] = '';
        }
        return newboard;
    }
    // For each set in forest, tries to find a liberty
    // If no liberties, then the set is captured
    function getLiberties(board, forest) {
        var dim = board.length;
        var boardAfterEval = copyObject(board);
        for (var i = 0; i < forest.length; i++) {
            var liberties = 0; // liberties found
            var tempset = forest[i];
            for (var i2 = 0; i2 < tempset.length; i2++) {
                var row = tempset[i2][0];
                var col = tempset[i2][1];
                if ((row - 1 >= 0 && board[row - 1][col] === '') ||
                    (row + 1 < dim && board[row + 1][col] === '') ||
                    (col - 1 >= 0 && board[row][col - 1] === '') ||
                    (col + 1 < dim && board[row][col + 1] === '')) {
                    liberties++;
                    break;
                }
            }
            if (liberties === 0) {
                boardAfterEval = cleanBoard(boardAfterEval, tempset);
            }
        }
        return boardAfterEval;
    }
    // evaluates WEIQI board using union-find algorithm
    function evaluateBoard(board, turn) {
        var forest = getSets(board);
        var black = forest.black;
        var white = forest.white;
        // Iterate through the sets to find ones without liberties
        // First analyze the liberties of the opponent
        var boardAfterEval = getLiberties(board, turn === 0 ? white : black);
        boardAfterEval = getLiberties(boardAfterEval, turn === 0 ? black : white);
        return boardAfterEval;
    }
    function isBoardFull(board) {
        var dim = board.length;
        for (var i = 0; i < dim; i++) {
            for (var j = 0; j < dim; j++) {
                if (!board[i][j])
                    return false;
            }
        }
        return true;
    }
    // returns a random move that the computer plays
    function createComputerMove(boardBeforeMove, board, passes, turnIndexBeforeMove) {
        var possibleMoves = [];
        var dim = board.length;
        for (var i = 0; i < dim; i++) {
            for (var j = 0; j < dim; j++) {
                var delta = { row: i, col: j };
                try {
                    var testmove = createMove(boardBeforeMove, board, passes, null, delta, turnIndexBeforeMove);
                    possibleMoves.push(testmove);
                }
                catch (e) {
                }
            }
        }
        try {
            var delta = { row: -1, col: -1 };
            var testmove = createMove(boardBeforeMove, board, passes, null, delta, turnIndexBeforeMove);
            possibleMoves.push(testmove);
        }
        catch (e) {
        }
        var randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        return randomMove;
    }
    gameLogic.createComputerMove = createComputerMove;
    function getboardNum(board, turnIndex) {
        var sum = 0;
        var dim = board.length;
        var color = turnIndex ? 'W' : 'B';
        for (var i = 0; i < dim; i++)
            for (var j = 0; j < dim; j++)
                if (board[i][j] === color)
                    sum++;
        return sum;
    }
    function createMove(boardBeforeMove, board, passes, deadBoard, delta, turnIndexBeforeMove) {
        if (!passes)
            passes = 0;
        var dim = board.length;
        if (!boardBeforeMove)
            boardBeforeMove = createNewBoard(dim);
        var setnumBefore = getboardNum(board, turnIndexBeforeMove);
        var boardAfterMove = copyObject(board);
        var passesAfterMove = passes;
        var row = delta.row;
        var col = delta.col;
        if (row === -1 && col === -1) {
            // delta of {-1, -1} indicates a pass (no move made)
            passesAfterMove++;
            if (passesAfterMove > 2) {
                throw Error('Exceeded number of possible passes.');
            }
        }
        else if (boardAfterMove[row][col] !== '') {
            // if space isn't '' then bad move
            throw Error('Space is not empty!');
        }
        else {
            // else make the move/change the board
            // bad delta should automatically throw error
            boardAfterMove[row][col] = turnIndexBeforeMove === 0 ? 'B' : 'W';
            passesAfterMove = 0; //if a move is made, passes is reset
            // evaluate board
            boardAfterMove = evaluateBoard(boardAfterMove, turnIndexBeforeMove);
        }
        var setnumAfter = getboardNum(boardAfterMove, turnIndexBeforeMove);
        if (setnumAfter <= setnumBefore && passes === passesAfterMove)
            throw Error('you can not suicide.');
        if (angular.equals(boardBeforeMove, boardAfterMove) && passes === passesAfterMove)
            throw Error("don’t allow a move that brings the game back to stateBeforeMove.");
        var endMatchScores = null;
        var turnIndexAfterMove = 1 - turnIndexBeforeMove;
        if (isBoardFull(boardAfterMove)) {
            endMatchScores = [-1, -1];
            turnIndexAfterMove = -1;
        }
        return {
            endMatchScores: endMatchScores,
            turnIndex: turnIndexAfterMove,
            state: {
                board: boardAfterMove,
                boardBeforeMove: boardBeforeMove,
                delta: delta,
                passes: passesAfterMove,
                deadBoard: deadBoard,
            },
        };
    }
    gameLogic.createMove = createMove;
    function createEndMove(state, endMatchScores) {
        return {
            endMatchScores: endMatchScores,
            turnIndex: -1,
            state: state,
        };
    }
    gameLogic.createEndMove = createEndMove;
})(gameLogic || (gameLogic = {}));
