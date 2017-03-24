interface SupportedLanguages {
  en: string, iw: string,
  pt: string, zh: string,
  el: string, fr: string,
  hi: string, es: string,
};
interface Score {
  white: number, black: number;
}

module game {
  export let isModalShown = false;
  export let modalTitle = "";
  export let modalBody = "";
  
  export let $rootScope: angular.IScope = null;
  export let $timeout: angular.ITimeoutService = null;
  export let currentUpdateUI: IUpdateUI = null;
  export let didMakeMove: boolean = false; // You can only make one move per updateUI
  export let board: Board = null;
  export let boardBeforeMove: Board = null;
  export let moveToConfirm: BoardDelta = null;
  export let delta: BoardDelta = null;
  export let passes: number;
  export let turnIndex: number;
  // For marking dead groups at the end of a match (only one player does it: the last one that passed)
  export let allSets: Points[];
  export let deadBoard: boolean[][] = null;
  export let score: Score = {white: 0, black: 0};
  // For community games.
  export let playerIdToProposal: IProposals = null;
  export let proposals: number[][] = null;
  export let yourPlayerInfo: IPlayerInfo = null;

  export let hidePassButtonForTesting = location.search == "?hidePassButtonForTesting"; // only locally to create printscreens of just the board.

  export let hasDim = false;
  export let dim = 9;
  export function rowsPercent() {
    return 100/dim;
  }
  export function dotX(m: number) {
    return -rowsPercent()/2 + (rowsPercent())*((dim == 9 ? 2 : 3) +
        (dim == 19 ? 6 : dim == 13 ? 3 : 2)*m+1);
  }

  let clickToDragPiece: HTMLImageElement;
  let draggingLines: HTMLElement;
  let horizontalDraggingLine: HTMLElement;
  let verticalDraggingLine: HTMLElement;
  export let gameArea: HTMLElement;
  export let boardArea: HTMLElement;

  export function clickedOnModal(evt: Event) {
    if (evt.target === evt.currentTarget) {
      evt.preventDefault();
      evt.stopPropagation();
      isModalShown = false;
    }
    return true;
  }

  function getTranslations(): Translations {
    return {
      "MODAL_BUTTON_CLOSE": {
        "en": "Close",
        "iw": "סגור",
        "pt": "Fechar",
        "zh": "关闭",
        "el": "Κλείσιμο",
        "fr": "fermer",
        "hi": "बंद करे",
        "es": "Cerrar"
      },
      "MODAL_BODY_AGREE_WITH_DEAD": {
        "en": "Your opponent marked all dead stones, which appear smaller and blinking.\nIf you agree, click Agree and the game will end.\nIf you disagree, click Continue playing and then make your move.\n",
        "iw": "היריב שלך מסומן כל האבנים המתות, אשר מופיעות קטן מהבהבת.\nאם אתה מסכים, לחץ על סכם המשחק יסתיים.\nאם אינך מסכים, לחץ על המשך לשחק ואז לעשות את הצעד הבא שלך.\n",
        "pt": "Seu oponente marcado todas as pedras mortas, que aparecem menor e piscando.\nSe você concordar, clique em Concordo e o jogo terminará.\nSe você não concordar, clique em Continuar a jogar e, em seguida, fazer a sua jogada.\n",
        "zh": "你的对手标记都死了块石头，看起来更小和闪烁。\n如果您同意，请单击同意，游戏将结束。\n如果您不同意，请点击继续玩，然后让你的举动。\n",
        "el": "Ο αντίπαλός σας επισημαίνονται όλα τα νεκρά πέτρες, οι οποίες εμφανίζονται μικρότερα και αναβοσβήνει.\nΕάν συμφωνείτε, κάντε κλικ στο κουμπί Αποδοχή και το παιχνίδι θα τελειώσει.\nΑν διαφωνείτε, κάντε κλικ στην επιλογή Συνέχεια παιχνιδιού και στη συνέχεια να κάνετε την κίνηση σας.\n",
        "fr": "Votre adversaire a marqué toutes les pierres mortes, qui apparaissent plus petits et clignote.\nSi vous êtes d'accord, cliquez sur Accepter et le jeu se terminera.\nSi vous n'êtes pas d'accord, cliquez sur Continuer à jouer et ensuite faire votre déménagement.\n",
        "hi": "अपने प्रतिद्वंद्वी को सभी मृत पत्थर है, जो छोटे और निमिष दिखाई चिह्नित।\nअगर आप सहमत हैं, सहमत क्लिक करें और खेल खत्म हो जाएगा।\nयदि आप असहमत हैं, खेल जारी रखने के लिए क्लिक करें और फिर अपनी चाल बनाओ।\n",
        "es": "Su oponente marcó todas las piedras muertas, que aparecen más pequeño y parpadeando.\nSi está de acuerdo, haga clic en Aceptar y el juego terminará.\nSi no está de acuerdo, haga clic en Continuar de juego y luego hacer su movimiento.\n"
      },
      "MODAL_TITLE_AGREE_WITH_DEAD": {
        "en": "Agree/disagree with dead stone selection",
        "iw": "מסכים / לא מסכים עם בחירת אבן מתה",
        "pt": "Concorda / discorda com a seleção de pedra morta",
        "zh": "同意/死石头的选择不同意",
        "el": "Συμφωνούν / διαφωνούν με νεκρούς επιλογή πέτρα",
        "fr": "D'accord / pas d'accord avec la sélection de pierre morte",
        "hi": "सहमत / मृत पत्थर चयन से असहमत",
        "es": "De acuerdo / desacuerdo con la selección piedra muerta"
      },
      "MODAL_BODY_MARK_DEAD": {
        "en": "Dead stones will appear smaller and blinking. When you're done, click Confirm.",
        "iw": "אבני מלח תופענה קטנות מהבהב. כשתסיים, לחץ על אשר.",
        "pt": "pedras mortas aparece menor e piscando. Quando estiver pronto, clique em Confirmar.",
        "zh": "死者的石头会出现小和闪烁。当您完成后，点击确认。",
        "el": "Νεκρά πέτρες θα εμφανιστεί μικρότερα και αναβοσβήνει. Όταν τελειώσετε, κάντε κλικ στο κουμπί Επιβεβαίωση.",
        "fr": "pierres mortes apparaissent plus petites et clignote. Lorsque vous avez terminé, cliquez sur Confirmer.",
        "hi": "मृत पत्थर छोटे और निमिष दिखाई देगा। जब आप कर रहे हैं, की पुष्टि करें।",
        "es": "piedras muertas aparecen más pequeño y parpadeando. Cuando haya terminado, haga clic en Confirmar."
      },
      "MODAL_TITLE_MARK_DEAD": {
        "en": "Mark the dead stones",
        "iw": "סמן את האבנים מת",
        "pt": "Marcar as pedras mortas",
        "zh": "纪念死者的石头",
        "el": "Επισημάνετε τα νεκρά πέτρες",
        "fr": "Marquez les pierres mortes",
        "hi": "मृत पत्थर मार्क",
        "es": "Marcar las piedras muertas"
      },
      "OPPONENT_CHOOSE_BOARD_SIZE": {
        "en": "Opponent is choosing the board size, and making the first move.",
        "iw": "יריב הוא בחירת גודל הלוח, ועושה את הצעד הראשון.",
        "pt": "Adversário é escolher o tamanho da placa e fazer o primeiro movimento.",
        "zh": "对手是选择电路板尺寸，并使先机。",
        "el": "Αντίπαλος είναι η επιλογή του μεγέθους του σκάφους, και να κάνει την πρώτη κίνηση.",
        "fr": "Adversaire est de choisir la taille du conseil d'administration, et de faire le premier pas.",
        "hi": "प्रतिद्वन्दी बोर्ड आकार का चयन किया जाता है, और पहला कदम बना रही है।",
        "es": "Oponente es elegir el tamaño del tablero, y dar el primer paso."
      },
      "CHOOSE_BOARD_SIZE": {
        "en": "Choose board size",
        "iw": "בחר את גודל הלוח",
        "pt": "Escolha do tamanho da placa",
        "zh": "选择电路板尺寸",
        "el": "Επιλέξτε το μέγεθος του σκάφους",
        "fr": "Choisissez la taille du conseil",
        "hi": "बोर्ड आकार चुनें",
        "es": "Elija el tamaño del tablero"
      },
      "CONFIRM": {
        "en": "CONFIRM",
        "iw": "אשר",
        "pt": "CONFIRMAR",
        "zh": "确认",
        "el": "ΕΠΙΒΕΒΑΙΏΝΩ",
        "fr": "CONFIRMER",
        "hi": "पुष्टि करें",
        "es": "CONFIRMAR"
      },
      "PASS": {
        "en": "PASS",
        "iw": "עבור",
        "pt": "passo",
        "zh": "我通过移动",
        "el": "Έχω περάσει την κίνηση",
        "fr": "Je passe le déménagement",
        "hi": "मैं इस कदम से पारित",
        "es": "Paso el movimiento"
      },
      "END_GAME": {
        "en": "END GAME",
        "iw": "סיים משחק",
        "pt": "termino",
        "zh": "我结束比赛",
        "el": "Έχω τελειώσει το παιχνίδι",
        "fr": "Je finis le jeu",
        "hi": "मैं खेल खत्म",
        "es": "Termino el juego"
      },
      "SELECT_DEAD": {
        "en": "Select dead",
        "iw": "בחר מתים",
        "pt": "Selecione mortos",
        "zh": "选择死",
        "el": "Επιλέξτε νεκρούς",
        "fr": "Sélectionnez morts",
        "hi": "मृत का चयन करें",
        "es": "Seleccionar muertos"
      },
      "AGREE": {
        "en": "Agree",
        "iw": "לְהַסכִּים",
        "pt": "concordar",
        "zh": "同意",
        "el": "Συμφωνώ",
        "fr": "Se mettre d'accord",
        "hi": "इस बात से सहमत",
        "es": "De acuerdo"
      },
      "CONTINUE_PLAYING": {
        "en": "Continue playing",
        "iw": "המשך משחק",
        "pt": "continuar a jogar",
        "zh": "继续打",
        "el": "συνεχίσετε να παίζετε",
        "fr": "Continuez de jouer",
        "hi": "खेल जारी",
        "es": "Sigue jugando"
      },
      "GAME_OVER": {
        "en": "Game over! Black: {{BLACK_SCORE}}, White: {{WHITE_SCORE}}",
        "iw": "סוף המשחק! שחור: {{BLACK_SCORE}}, לבן: {{WHITE_SCORE}}",
        "pt": "Fim de jogo! Preto: {{BLACK_SCORE}}, White: {{WHITE_SCORE}}",
        "zh": "游戏结束！黑色：{{BLACK_SCORE}}，白{{WHITE_SCORE}}",
        "el": "Τέλος παιχνιδιού! Μαύρο: {{BLACK_SCORE}}, Λευκά: {{WHITE_SCORE}}",
        "fr": "Jeu terminé! Noir: {{BLACK_SCORE}}, Blanc: {{WHITE_SCORE}}",
        "hi": "खेल खत्म! ब्लैक: {{BLACK_SCORE}}, व्हाइट: {{WHITE_SCORE}}",
        "es": "¡Juego terminado! Negro: {{BLACK_SCORE}}, blanco: {{WHITE_SCORE}}"
      }
    };
  }

  export function init($rootScope_: angular.IScope, $timeout_: angular.ITimeoutService) {
    $rootScope = $rootScope_;
    $timeout = $timeout_;

    draggingLines = document.getElementById("draggingLines");
    horizontalDraggingLine = document.getElementById("horizontalDraggingLine");
    verticalDraggingLine = document.getElementById("verticalDraggingLine");
    clickToDragPiece = <HTMLImageElement>document.getElementById("clickToDragPiece");
    gameArea = document.getElementById("gameArea");
    boardArea = document.getElementById("boardArea");

    translate.setTranslations(getTranslations());
    translate.setLanguage('en');
    resizeGameAreaService.setWidthToHeight(hidePassButtonForTesting ? 1 : 0.8);
    dragAndDropService.addDragListener("boardArea", handleDragEvent);
    gameService.setGame({
      updateUI: updateUI,
      getStateForOgImage: getStateForOgImage,
    });
  }

  export function getStateForOgImage() {
    if (!currentUpdateUI || !currentUpdateUI.state) {
      log.warn("Got stateForOgImage without currentUpdateUI!");
      return;
    }
    let state: IState = currentUpdateUI.state;
    if (!state || !hasDim) return '';
    let board: string[][] = state.board;
    if (!board) return '';
    let boardStr: string = '';
    for (let row = 0 ; row < dim; row++) {
      for (let col = 0 ; col < dim; col++) {
        boardStr += board[row][col] == 'W' ? 'w' : board[row][col] == 'B' ? 'b' : 'x';
      }
    }
    return boardStr;
  }  

  export function getPasses() {
    return passes;
  }


  export function showContinuePlayingOrAgreeButtons() {
    return passes == 2 && isMyTurn();
  }

  export function continuePlayingClicked() {
    if (!showContinuePlayingOrAgreeButtons()) return;
    log.info("continuePlayingClicked");
    passes = 0;
    score = {white: 0, black: 0};
    resetDeadSets();
  }
  export function agreeClicked() {
    if (!showContinuePlayingOrAgreeButtons()) return;
    log.info("agreeClicked");
    let scoreDiff = score.black - score.white - 6.5; // komi is 6.5 points (on all board sizes.)
    let endMatchScores: number[] = scoreDiff > 0 ? [1, 0] : [0, 1];
    log.info("scores=", score, " endMatchScores=", endMatchScores);
    makeMove(gameLogic.createEndMove(currentUpdateUI.state, endMatchScores));
  }

  export function showConfirmButton() {
    return moveToConfirm != null;
  }
  export function confirmClicked() {
    if (!showConfirmButton()) return;
    log.info("confirmClicked, passes=", passes, " moveToConfirm=", moveToConfirm);
    if (isConfirmingPass() && passes >= 1) {
      // Game is over, so let's mark dead groups.
      showModal('MODAL_TITLE_MARK_DEAD', 'MODAL_BODY_MARK_DEAD');
      initDeadSets();
    } else {
      cellClicked(moveToConfirm.row, moveToConfirm.col);
      clearClickToDrag();
      moveToConfirm = null;
    }
  }

  function showModal(titleId: string, bodyId: string) {
    if (!isMyTurn()) return;
    log.info("showModal: ", titleId);
    isModalShown = true;
    modalTitle = translate(titleId);
    modalBody = translate(bodyId);
  }

  let cacheIntegersTill: number[][] = [];
  export function getIntegersTill(number: any): number[] {
    if (cacheIntegersTill[number]) return cacheIntegersTill[number]; 
    let res: number[] = [];
    for (let i = 0; i < number; i++) {
      res.push(i);
    }
    cacheIntegersTill[number] = res;
    return res;
  }
  let cacheMatrixTill: number[][][] = [];
  export function getMatrixTill(number: any): number[][] {
    if (cacheMatrixTill[number]) return cacheMatrixTill[number]; 
    let res: number[][] = [];
    for (let i = 0; i < number; i++) {
      for (let j = 0; j < number; j++) {
        res.push([i,j]);
      }
    }
    cacheMatrixTill[number] = res;
    return res;
  }

  function handleDragEvent(type: any, clientX: any, clientY: any) {
    if (!isHumanTurn() || passes == 2) {
      return; // if the game is over, do not display dragging effect
    }

    if (type === "touchstart" && moveToConfirm != null && deadBoard == null) {
      moveToConfirm = null;
      $rootScope.$apply();
    }

    // Center point in boardArea
    let x = clientX - boardArea.offsetLeft - gameArea.offsetLeft;
    let y = clientY - boardArea.offsetTop - gameArea.offsetTop;
    // Is outside boardArea?
    let button = document.getElementById("button");
    if (x < 0 || x >= boardArea.clientWidth || y < 0 || y >= boardArea.clientHeight) {
      clearClickToDrag();
      return;
    }
    // Inside boardArea. Let's find the containing square's row and col
    let col = Math.floor(dim * x / boardArea.clientWidth);
    let row = Math.floor(dim * y / boardArea.clientHeight);
    // if the cell is not empty, don't preview the piece, but still show the dragging lines
    if ((board[row][col] !== '' && deadBoard == null) ||
        (board[row][col] == '' && deadBoard != null)) {
      clearClickToDrag();
      return;
    }
    clickToDragPiece.style.display = deadBoard == null ? "inline" : "none";
    draggingLines.style.display = "inline";
    let centerXY = getSquareCenterXY(row, col);
    verticalDraggingLine.setAttribute("x1", "" + centerXY.x);
    verticalDraggingLine.setAttribute("x2", "" + centerXY.x);
    horizontalDraggingLine.setAttribute("y1", "" + centerXY.y);
    horizontalDraggingLine.setAttribute("y2", "" + centerXY.y);
    // show the piece
    //let cell = document.getElementById('board' + row + 'x' + col).className = $scope.turnIndex === 0 ? 'black' : 'white';

    let topLeft = getSquareTopLeft(row, col);
    clickToDragPiece.style.left = topLeft.left + "px";
    clickToDragPiece.style.top = topLeft.top + "px";
    if (type === "touchend" || type === "touchcancel" || type === "touchleave") {
      // drag ended
      dragDone(row, col);
    }
  }

  function clearClickToDrag() {
    clickToDragPiece.style.display = "none";
    draggingLines.style.display = "none";
  }

  function getSquareTopLeft(row: number, col: number) {
    let size = getSquareWidthHeight();
    return { top: row * size.height, left: col * size.width }
  }
  function getSquareWidthHeight() {
    let boardArea = document.getElementById("boardArea");
    return {
      width: boardArea.clientWidth / (dim),
      height: boardArea.clientHeight / (dim)
    };
  }
  function getSquareCenterXY(row: number, col: number) {
    let size = getSquareWidthHeight();
    return {
      x: col * size.width + size.width / 2,
      y: row * size.height + size.height / 2
    };
  }
  function dragDone(row: number, col: number) {
    $rootScope.$apply(function () {
      if (deadBoard == null) {
        moveToConfirm = {row: row, col: col};
      } else {
        toggleDead(row, col);
        clearClickToDrag();
      }
    });
  }

  function setDeadSets(_deadBoard: boolean[][]) {
    deadBoard = _deadBoard;
  }
  function resetDeadSets() {
    allSets = null;
    deadBoard = null;
  }
  function initDeadSets() {
    let sets = gameLogic.getSets(board);
    allSets = sets.white.concat(sets.black);
    deadBoard = gameLogic.createNewBoardWithElement(dim, false);
  }
  function toggleDead(row: number, col: number) {
    if (deadBoard == null || allSets == null) return; // defensive programming
    if (board[row][col] == '') return; // nothing there
    let set = findSet(row, col);
    for (let point of set) {
      deadBoard[point[0]][point[1]] = !deadBoard[point[0]][point[1]];
    }
  }
  export function isDead(row: number, col: number) {
    return deadBoard && deadBoard[row][col];
  }
  function findSet(row: number, col: number): Points {
    for (let points of allSets) {
      for (let point of points) {
        if (point[0] == row && point[1] == col) return points;
      }
    }
    throw new Error("Couldn't find set for row=" + row + " col=" + col);
  }

  export function setDim(d: number) {
    dim = d;
    hasDim = true;
    board = gameLogic.createNewBoard(dim);
    boardBeforeMove = gameLogic.createNewBoard(dim);
  }
  
  export function getBoardPiece(row: number, col: number): string {
    let piece = game.board[row][col];
    let pieceBefore = game.boardBeforeMove[row][col]; 
    let isProposal = proposals && proposals[row][col] > 0;
    return isProposal ? (currentUpdateUI.turnIndex == 0 ? 'B' : 'W') :
        !piece && !pieceBefore ? '' : (piece == 'B'  || pieceBefore == 'B' ? 'B' : 'W');
  } 

  export function getCellStyle(row: number, col: number): Object {
    if (!proposals) return {};
    let count = proposals[row][col];
    if (count == 0) return {};
    // proposals[row][col] is > 0
    let countZeroBased = count - 1;
    let maxCount = currentUpdateUI.numberOfPlayersRequiredToMove - 2;
    let ratio = maxCount == 0 ? 1 : countZeroBased / maxCount; // a number between 0 and 1 (inclusive).
    // scale will be between 0.6 and 0.8.
    let scale = 0.6 + 0.2 * ratio;
    // opacity between 0.5 and 0.7
    let opacity = 0.5 + 0.2 * ratio;
    return {
      transform: `scale(${scale}, ${scale})`,
      opacity: "" + opacity,
    };
  }

  function updateProposals() {
    // This must be after calling updateUI, because we nullify things there (like proposals)
    didMakeMove = !!playerIdToProposal[yourPlayerInfo.playerId];
    proposals = gameLogic.createNewBoardWithElement(19, 0); // Community matches are always 19x19.
    proposals[-1] = [];
    proposals[-1][-1] = 0; // number of times we proposed to pass.
    for (let playerId in playerIdToProposal) {
      let proposal = playerIdToProposal[playerId];
      let delta = proposal.data.delta;
      proposals[delta.row][delta.col]++;
    }
  }

  function updateUI(params: IUpdateUI) {
    log.info("Game got updateUI:", params);
    didMakeMove = false; // Only one move per updateUI
    yourPlayerInfo = params.yourPlayerInfo;
    playerIdToProposal = params.playerIdToProposal;
    proposals = null;
    if (playerIdToProposal) {
      updateProposals();
      // If only proposals changed, then return.
      // I don't want to disrupt the player if he's in the middle of a move.
      params.playerIdToProposal = null;
      if (currentUpdateUI && angular.equals(currentUpdateUI, params)) return;
    }

    currentUpdateUI = params;
    score = {white: 0, black: 0};
    resetDeadSets();
    clearClickToDrag();
    moveToConfirm = null;
    if (isFirstMove()) {
      hasDim = false;
      delta = null;
      board = gameLogic.createNewBoard(dim);
      boardBeforeMove = gameLogic.createNewBoard(dim);
      passes = 0;
      if (playerIdToProposal) setDim(19); // Community matches are always 19x19.
    } else {
      let state = params.state;
      board = state.board;
      hasDim = true;
      dim = board.length;
      boardBeforeMove = state.boardBeforeMove;
      delta = state.delta;
      passes = state.passes;
      setDeadSets(state.deadBoard);
      if (passes == 2) {
        calcScore();
      }
      if (showContinuePlayingOrAgreeButtons()) { 
        showModal('MODAL_TITLE_AGREE_WITH_DEAD', 'MODAL_BODY_AGREE_WITH_DEAD');
      }
    }
    turnIndex = params.turnIndex;
    clickToDragPiece.src = "imgs/" + (turnIndex === 0 ? 'black' : 'white') + "Stone.svg";
    if (isComputerTurn()) {
      $timeout(maybeSendComputerMove, 500);
    }
  }

  export function calcScore() {
    score = {white: 0, black: 0};
    let liveBoard = angular.copy(board); 
    let emptyBoard = gameLogic.createNewBoard(dim); // has 'W' in all empty places.
    for (let row = 0 ; row < dim; row++) {
      for (let col = 0 ; col < dim; col++) {
         if (deadBoard && deadBoard[row][col]) liveBoard[row][col] = '';
         if (liveBoard[row][col] == '') emptyBoard[row][col] = 'W';
      }
    }
    let sets = gameLogic.getSets(liveBoard);
    for (let set of sets.white) score.white += set.length;
    for (let set of sets.black) score.black += set.length;
    let emptySets = gameLogic.getSets(emptyBoard).white;
    // For each empty group, decide if it's surrounded by black/white/both.
    for (let emptySet of emptySets) {
      let neighborColor: string = '';
      for (let point of emptySet) {
        let row = point[0];
        let col = point[1];
        neighborColor = updateColor(row - 1 >= 0 ? liveBoard[row - 1][col] : '', neighborColor);
        neighborColor = updateColor(row + 1 < dim ? liveBoard[row + 1][col] : '', neighborColor);
        neighborColor = updateColor(col - 1 >= 0 ? liveBoard[row][col - 1] : '', neighborColor);
        neighborColor = updateColor(col + 1 < dim ? liveBoard[row][col + 1] : '', neighborColor);
        if (neighborColor == 'Both') break;
      }
      if (neighborColor == 'W') score.white += emptySet.length;
      else if (neighborColor == 'B') score.black += emptySet.length;
    }
  }
  function updateColor(color: string, neighborColor: string) {
    return color == '' ? neighborColor : (neighborColor == color || neighborColor == '' ? color : 'Both'); 
  }

  function maybeSendComputerMove() {
    if (!isComputerTurn()) return;
    let move = gameLogic.createComputerMove(boardBeforeMove, board, passes, turnIndex);
    log.info("Computer move: ", move);
    makeMove(move);
  }

  function makeMove(move: IMove) {
    if (didMakeMove) { // Only one move per updateUI
      return;
    }
    didMakeMove = true;
    if (!proposals) {
      gameService.makeMove(move, null);
    } else {
      let delta = move.state.delta;
      let isPass = delta.row == -1 && delta.col == -1;
      let myProposal:IProposal = {
        data: {
          delta: delta,
          deadBoard: move.state.deadBoard,
        },
        chatDescription: isPass ? "Pass" : indexToLetter(delta.col) + indexToNumber(delta.row),
        playerInfo: yourPlayerInfo,
      };
      // Decide whether we make a move or not.
      if (proposals[delta.row][delta.col] < currentUpdateUI.numberOfPlayersRequiredToMove - 1) {
        move = null;
      } else {
        // yes, making a move! The only tricky part is the last move when we select dead groups:
        if (move.state.deadBoard) {
          // we have 3 proposals for selecting dead groups. I decided that a piece is dead if 2 proposals
          // at least agreed that it's dead (so one nasty player won't mess up the score).
          let deadBoardProposals = [move.state.deadBoard];   
          for (let playerId in playerIdToProposal) {
            let deadBoard = playerIdToProposal[playerId].data.deadBoard;
            if (deadBoard) deadBoardProposals.push(deadBoard);
          }
          let chosenDeadBoardProposal = gameLogic.createNewBoardWithElement(dim, false);
          for (let row = 0; row < dim; row++) {
            for (let col = 0; col < dim; col++) {
              let deadCount = 0;
              for (let deadBoardProposal of deadBoardProposals) {
                if (deadBoardProposal[row][col]) deadCount++;
              }
              chosenDeadBoardProposal[row][col] = (deadCount >= 2);
            }
          }
          move.state.deadBoard = chosenDeadBoardProposal;
        }
      }
      gameService.makeMove(move, myProposal);
    }
  }

  function isFirstMove() {
    return !currentUpdateUI.state;
  }

  function yourPlayerIndex() {
    return currentUpdateUI.yourPlayerIndex;
  }

  function isComputer() {
    let playerInfo = currentUpdateUI.playersInfo[currentUpdateUI.yourPlayerIndex];
    return playerInfo && playerInfo.playerId === '';
  }

  export function isComputerTurn() {
    return isMyTurn() && isComputer();
  }

  export function isHumanTurn() {
    return isMyTurn() && !isComputer();
  }

  export function isMyTurn() {
    return !didMakeMove && // you can only make one move per updateUI.
      currentUpdateUI.turnIndex >= 0 && // game is ongoing
      currentUpdateUI.yourPlayerIndex === currentUpdateUI.turnIndex; // it's my turn
  }

  export function passClicked() {
    //Clicking on the PASS button triggers this function
    //It will increment the number of passes.
    log.log(["Clicked on pass.", passes]);
    moveToConfirm = {row: -1, col: -1};
    clearClickToDrag();
  }
  export function isPassBtnEnabled(): boolean {
    return !currentUpdateUI.endMatchScores && deadBoard == null;
  }
  export function getPassBtnClasses(): string {
    return (isConfirmingPass() ? 'confirmingPass' : '') + ' text passBtn ' +
          (isPassBtnEnabled() ? 'pass' + passes : 'btnAsText');
  }
  export function isConfirmingPass(): boolean {
    return deadBoard == null && moveToConfirm && moveToConfirm.row == -1 && moveToConfirm.col == -1;
  }

  export function shouldHidePassButton() {
    return showContinuePlayingOrAgreeButtons() || isComputerTurn() || (!isMyTurn() && !currentUpdateUI.endMatchScores) || hidePassButtonForTesting;
  }

  export function getButtonValue() {
    if (currentUpdateUI.endMatchScores) {
      return translate('GAME_OVER', {BLACK_SCORE: ''+score.black, WHITE_SCORE: ''+score.white});
    }
    switch (passes) {
      case 0: return translate('PASS');
      case 1: return translate(deadBoard != null ? 'SELECT_DEAD' : 'END_GAME');
      default: return translate('PASS');
    }
  }

  function cellClicked(rrow: number, ccol: number) {
    log.log(["Clicked on cell:", rrow, ccol]);
    if (!isHumanTurn()) {
      return;
    }
    try {
      let delta = { row: rrow, col: ccol };
      let move = gameLogic.createMove(boardBeforeMove, board, passes, deadBoard, delta, turnIndex);
      makeMove(move);
    } catch (e) {
      log.log(["Cannot make move:", rrow, ccol, e]);
      return;
    }
  }

  export function shouldSlowlyDrop(rrow: number, ccol: number) {
    return delta &&
      delta.row === rrow &&
      delta.col === ccol;
  }

  export function shouldExplode(row: number, col: number) {
    return boardBeforeMove[row][col] && !board[row][col];
  }

  // Returns "A" ... (but skip over "I"), see http://www.5z.com/psp/goboard.jpg
  export function indexToNumber(i: number): number {
    return dim - i;
  }
  export function indexToLetter(i: number): string {
    return String.fromCharCode(65+(i<8 ? i : i+1));
  }
  export function fontSizePx(): number {
    // for iphone4 (min(width,height)=320) it should be 8.
    return 8*Math.min(window.innerWidth, window.innerHeight) / 320;
  }
}

angular.module('myApp', ['gameServices'])
  .run(['$rootScope', '$timeout', 
  function ($rootScope: angular.IScope, $timeout: angular.ITimeoutService) {
    $rootScope['game'] = game;
    game.init($rootScope, $timeout);
  }]);
