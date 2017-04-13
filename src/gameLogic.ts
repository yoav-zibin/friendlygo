type Board = string[][]; // 'B' is black, 'W' is white, '' is empty
interface BoardDelta {
  row: number;
  col: number;
}
interface IState {
  board: Board;
  boardBeforeMove: Board;
  delta: BoardDelta; // [-1,-1] means a pass.
  passes: number;
  deadBoard: boolean[][];
  // For the rule of KO:
  // One may not capture just one stone, if that stone was played on the previous move, and that move also captured just one stone.
  posJustCapturedForKo: BoardDelta;
}
interface IProposalData {
  delta: BoardDelta; // [-1,-1] means a pass.
  deadBoard: boolean[][]; // The last move in the game chooses the dead group.
}
type Points = number[][]; // A point (row,col) is represented as an array with 2 elements: [row,col].
type Sets = {white: Points[]; black: Points[];}

import gameService = gamingPlatform.gameService;
import alphaBetaService = gamingPlatform.alphaBetaService;
import translate = gamingPlatform.translate;
import resizeGameAreaService = gamingPlatform.resizeGameAreaService;
import log = gamingPlatform.log;
import dragAndDropService = gamingPlatform.dragAndDropService;

module gameLogic {
  function isEqual<T>(object1: T, object2: T) {
    return angular.equals(object1, object2)
  }

  // returns a new [empty] weiqi board
  // code adapted from: http://stackoverflow.com/questions/6495187/best-way-to-generate-empty-2d-array
  export function createNewBoardWithElement<T>(dim: number, element: T): T[][] {
    let rows = dim;
    let cols = dim;
    let array: T[][] = [], row: T[] = [];
    while (cols--)
      row.push(element);
    while (rows--)
      array.push(row.slice());
    return array;
  }
  export function createNewBoard(dim: number): Board {
    return createNewBoardWithElement(dim, '');
  }

  // returns copy of JS object
  function copyObject<T>(object: T): T {
    return angular.copy(object);
  }

  //Helper for getSets

  function getWeb(color: string, row: number, col: number, board: Board, visited: Board): Points {
    let points: Points = [];
    let dim = board.length;

    function tryPoints(row: number, col: number) {
      points.push([row, col]);
      visited[row][col] = color;
      if (row - 1 >= 0 && visited[row - 1][col] === '' && board[row - 1][col] === color)
      { tryPoints(row - 1, col); }
      if (row + 1 < dim && visited[row + 1][col] === '' && board[row + 1][col] === color)
      { tryPoints(row + 1, col); }
      if (col + 1 < dim && visited[row][col + 1] === '' && board[row][col + 1] === color)
      { tryPoints(row, col + 1); }
      if (col - 1 >= 0 && visited[row][col - 1] === '' && board[row][col - 1] === color)
      { tryPoints(row, col - 1); }
    }

    tryPoints(row, col);
    return points;
  }
  //Helper for getSets
  function mergeBoards(leader: Board, links: Board) {
    let dim = leader.length;
    let finalleader = copyObject(leader);
    let row: number, col: number;
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
  export function getSets(board: Board): Sets {
    let dim = board.length;
    let visited = createNewBoard(dim);
    let setsX: Points[] = []; // black sets
    let setsO: Points[] = []; // white sets
    let row: number, col: number;
    for (row = 0; row < dim; row++) {
      for (col = 0; col < dim; col++) {
        if (board[row][col] === 'B' && visited[row][col] === '') {
          setsX.push(getWeb('B', row, col, board, visited));
        } else if (board[row][col] === 'W' && visited[row][col] === '') {
          setsO.push(getWeb('W', row, col, board, visited));
        }
      }
    }
    return { black: setsX, white: setsO };
  }

  // Changes all arr locations in board to '' (empty)
  function cleanBoard(board: Board, arr: Points) {
    let newboard = copyObject(board);
    for (let i = 0; i < arr.length; i++) {
      let row = arr[i][0];
      let col = arr[i][1];
      newboard[row][col] = '';
    }
    return newboard;
  }

  // For each set in forest, tries to find a liberty
  // If no liberties, then the set is captured
  function getLiberties(board: Board, forest: Points[]) {
    let dim = board.length;
    let boardAfterEval = copyObject(board);
    
    for (let i = 0; i < forest.length; i++) {
      let liberties = 0; // liberties found
      let tempset: Points = forest[i];
      for (let i2 = 0; i2 < tempset.length; i2++) {
        let row = tempset[i2][0];
        let col = tempset[i2][1];
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
  function evaluateBoard(board: Board, turn: number) {
    let forest = getSets(board);
    let black = forest.black;
    let white = forest.white;

    // Iterate through the sets to find ones without liberties
    // First analyze the liberties of the opponent
    let boardAfterEval = getLiberties(board, turn === 0 ? white: black);
    boardAfterEval = getLiberties(boardAfterEval, turn === 0 ? black : white);
    
    return boardAfterEval;
  }

  function isBoardFull(board: Board) {
    let dim = board.length;
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        if (!board[i][j]) return false;
      }
    }
    return true;
  }

  // returns a random move that the computer plays
  export function createComputerMove(board: Board, passes: number, turnIndexBeforeMove: number, previousPosJustCapturedForKo: BoardDelta) {
    let possibleMoves: IMove[] = [];
    let dim = board.length;
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        let delta = { row: i, col: j };
        try {
          let testmove = createMove(board, passes, null, delta, turnIndexBeforeMove, previousPosJustCapturedForKo);
          possibleMoves.push(testmove);
        } catch (e) {
          // cell in that position was full
        }
      }
    }
    try {
      let delta = { row: -1, col: -1 };
      let testmove = createMove(board, passes, null, delta, turnIndexBeforeMove, previousPosJustCapturedForKo);
      possibleMoves.push(testmove);
    } catch (e) {
      // Couldn't add pass as a move?
    }
    let randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    return randomMove;
  }

  /** Returns the number of pieces of the color for turnIndex. */
  function getboardNum(board: Board, turnIndex: number): number {
    let sum = 0;
    let dim = board.length;
    let color = turnIndex ? 'W' : 'B';
    for (let i = 0; i < dim; i++)
      for (let j = 0; j < dim; j++)
        if (board[i][j] === color)
          sum++;
    return sum;
  }
  function getPosJustCapturedForKo(boardBeforeMove: Board, boardAfterMove: Board, turnIndex: number): BoardDelta {
    let oppositeColor = turnIndex ? 'B' : 'W';
    let result: BoardDelta = null;
    let dim = boardBeforeMove.length;
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        if (boardBeforeMove[i][j] === oppositeColor && boardAfterMove[i][j] === '') {
          // We ate an opponent piece
          if (result === null) {
            result = {row: i, col: j};
          } else {
            return null; // we ate more than one piece
          }
        }
      }
    }
    return result;
  }

  export function createMove(board: Board, passes: number, deadBoard: boolean[][], delta: BoardDelta, turnIndexBeforeMove: number, previousPosJustCapturedForKo: BoardDelta): IMove {
    if (!passes) passes = 0;
    let dim = board.length;

    let setnumBefore = getboardNum(board, turnIndexBeforeMove);

    let boardAfterMove = copyObject(board);
    let passesAfterMove = passes;

    let row = delta.row;
    let col = delta.col;
    if (row === -1 && col === -1) {
      // delta of {-1, -1} indicates a pass (no move made)
      passesAfterMove++;
      if (passesAfterMove > 2) {
        throw Error('Exceeded number of possible passes.');
      }
    } else if (boardAfterMove[row][col] !== '') {
      // if space isn't '' then bad move
      throw Error('Space is not empty!');
    } else {
      // else make the move/change the board
      if (previousPosJustCapturedForKo && previousPosJustCapturedForKo.row === row && previousPosJustCapturedForKo.col === col) {
        throw Error("KO!");
      }
      // bad delta should automatically throw error
      boardAfterMove[row][col] = turnIndexBeforeMove === 0 ? 'B' : 'W';
      passesAfterMove = 0; //if a move is made, passes is reset
      // evaluate board
      boardAfterMove = evaluateBoard(boardAfterMove, turnIndexBeforeMove);
    }

    let setnumAfter = getboardNum(boardAfterMove, turnIndexBeforeMove);
    
    if (setnumAfter <= setnumBefore && passes === passesAfterMove)
      throw Error('you can not suicide.');

    if (angular.equals(board, boardAfterMove) && passes === passesAfterMove)
      throw Error("don’t allow a move that brings the game back to stateBeforeMove.");
  
    let posJustCapturedForKo = getPosJustCapturedForKo(board, boardAfterMove, turnIndexBeforeMove);
    
    let endMatchScores: number[] = null;
    let turnIndexAfterMove = 1 - turnIndexBeforeMove;
    if (isBoardFull(boardAfterMove)) {
      endMatchScores = [-1,-1];
      turnIndexAfterMove = -1;
    }
    return {
        endMatchScores: endMatchScores,
        turnIndex: turnIndexAfterMove,
        state: {
            board: boardAfterMove,
            boardBeforeMove: board,
            delta: delta,
            passes: passesAfterMove,
            posJustCapturedForKo: posJustCapturedForKo,
            deadBoard: deadBoard,
        },
    };
  }

  export function createEndMove(state: IState, endMatchScores: number[]): IMove {
    return {
        endMatchScores: endMatchScores,
        turnIndex: -1,
        state: state,
    };
  }
}