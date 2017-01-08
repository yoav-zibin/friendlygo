;
var gameService = gamingPlatform.gameService;
var alphaBetaService = gamingPlatform.alphaBetaService;
var translate = gamingPlatform.translate;
var resizeGameAreaService = gamingPlatform.resizeGameAreaService;
var log = gamingPlatform.log;
var dragAndDropService = gamingPlatform.dragAndDropService;
var game;
(function (game) {
    game.isModalShown = false;
    game.modalTitle = "";
    game.modalBody = "";
    game.$rootScope = null;
    game.$timeout = null;
    game.currentUpdateUI = null;
    game.didMakeMove = false; // You can only make one move per updateUI
    game.board = null;
    game.boardBeforeMove = null;
    game.moveToConfirm = null;
    game.delta = null;
    game.deadBoard = null;
    game.score = { white: 0, black: 0 };
    // For community games.
    game.playerIdToProposal = null;
    game.proposals = null;
    game.yourPlayerInfo = null;
    game.hidePassButtonForTesting = location.search == "?hidePassButtonForTesting"; // only locally to create printscreens of just the board.
    game.hasDim = false;
    game.dim = 9;
    function rowsPercent() {
        return 100 / game.dim;
    }
    game.rowsPercent = rowsPercent;
    function dotX(m) {
        return -rowsPercent() / 2 + (rowsPercent()) * ((game.dim == 9 ? 2 : 3) +
            (game.dim == 19 ? 6 : game.dim == 13 ? 3 : 2) * m + 1);
    }
    game.dotX = dotX;
    var clickToDragPiece;
    var draggingLines;
    var horizontalDraggingLine;
    var verticalDraggingLine;
    function clickedOnModal(evt) {
        if (evt.target === evt.currentTarget) {
            evt.preventDefault();
            evt.stopPropagation();
            game.isModalShown = false;
        }
        return true;
    }
    game.clickedOnModal = clickedOnModal;
    function getTranslations() {
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
    function init($rootScope_, $timeout_) {
        game.$rootScope = $rootScope_;
        game.$timeout = $timeout_;
        draggingLines = document.getElementById("draggingLines");
        horizontalDraggingLine = document.getElementById("horizontalDraggingLine");
        verticalDraggingLine = document.getElementById("verticalDraggingLine");
        clickToDragPiece = document.getElementById("clickToDragPiece");
        game.gameArea = document.getElementById("gameArea");
        game.boardArea = document.getElementById("boardArea");
        translate.setTranslations(getTranslations());
        translate.setLanguage('en');
        resizeGameAreaService.setWidthToHeight(game.hidePassButtonForTesting ? 1 : 0.8);
        dragAndDropService.addDragListener("boardArea", handleDragEvent);
        gameService.setGame({
            updateUI: updateUI,
            communityUI: communityUI,
            getStateForOgImage: getStateForOgImage,
        });
    }
    game.init = init;
    function getStateForOgImage() {
        if (!game.currentUpdateUI || !game.currentUpdateUI.state) {
            log.warn("Got stateForOgImage without currentUpdateUI!");
            return;
        }
        var state = game.currentUpdateUI.state;
        if (!state || !game.hasDim)
            return '';
        var board = state.board;
        if (!board)
            return '';
        var boardStr = '';
        for (var row = 0; row < game.dim; row++) {
            for (var col = 0; col < game.dim; col++) {
                boardStr += board[row][col] == 'W' ? 'w' : board[row][col] == 'B' ? 'b' : 'x';
            }
        }
        return boardStr;
    }
    game.getStateForOgImage = getStateForOgImage;
    function getPasses() {
        return game.passes;
    }
    game.getPasses = getPasses;
    function showContinuePlayingOrAgreeButtons() {
        return game.passes == 2 && isMyTurn();
    }
    game.showContinuePlayingOrAgreeButtons = showContinuePlayingOrAgreeButtons;
    function continuePlayingClicked() {
        if (!showContinuePlayingOrAgreeButtons())
            return;
        log.info("continuePlayingClicked");
        game.passes = 0;
        game.score = { white: 0, black: 0 };
        resetDeadSets();
    }
    game.continuePlayingClicked = continuePlayingClicked;
    function agreeClicked() {
        if (!showContinuePlayingOrAgreeButtons())
            return;
        log.info("agreeClicked");
        var scoreDiff = game.score.black - game.score.white - 6.5; // komi is 6.5 points (on all board sizes.)
        var endMatchScores = scoreDiff > 0 ? [1, 0] : [0, 1];
        log.info("scores=", game.score, " endMatchScores=", endMatchScores);
        makeMove(gameLogic.createEndMove(game.currentUpdateUI.state, endMatchScores));
    }
    game.agreeClicked = agreeClicked;
    function showConfirmButton() {
        return game.moveToConfirm != null;
    }
    game.showConfirmButton = showConfirmButton;
    function confirmClicked() {
        if (!showConfirmButton())
            return;
        log.info("confirmClicked, passes=", game.passes, " moveToConfirm=", game.moveToConfirm);
        if (isConfirmingPass() && game.passes >= 1) {
            // Game is over, so let's mark dead groups.
            showModal('MODAL_TITLE_MARK_DEAD', 'MODAL_BODY_MARK_DEAD');
            initDeadSets();
        }
        else {
            cellClicked(game.moveToConfirm.row, game.moveToConfirm.col);
            clearClickToDrag();
            game.moveToConfirm = null;
        }
    }
    game.confirmClicked = confirmClicked;
    function showModal(titleId, bodyId) {
        log.info("showModal: ", titleId);
        game.isModalShown = true;
        game.modalTitle = translate(titleId);
        game.modalBody = translate(bodyId);
    }
    var cacheIntegersTill = [];
    function getIntegersTill(number) {
        if (cacheIntegersTill[number])
            return cacheIntegersTill[number];
        var res = [];
        for (var i = 0; i < number; i++) {
            res.push(i);
        }
        cacheIntegersTill[number] = res;
        return res;
    }
    game.getIntegersTill = getIntegersTill;
    var cacheMatrixTill = [];
    function getMatrixTill(number) {
        if (cacheMatrixTill[number])
            return cacheMatrixTill[number];
        var res = [];
        for (var i = 0; i < number; i++) {
            for (var j = 0; j < number; j++) {
                res.push([i, j]);
            }
        }
        cacheMatrixTill[number] = res;
        return res;
    }
    game.getMatrixTill = getMatrixTill;
    function handleDragEvent(type, clientX, clientY) {
        if (!isHumanTurn() || game.passes == 2) {
            return; // if the game is over, do not display dragging effect
        }
        if (type === "touchstart" && game.moveToConfirm != null && game.deadBoard == null) {
            game.moveToConfirm = null;
            game.$rootScope.$apply();
        }
        // Center point in boardArea
        var x = clientX - game.boardArea.offsetLeft - game.gameArea.offsetLeft;
        var y = clientY - game.boardArea.offsetTop - game.gameArea.offsetTop;
        // Is outside boardArea?
        var button = document.getElementById("button");
        if (x < 0 || x >= game.boardArea.clientWidth || y < 0 || y >= game.boardArea.clientHeight) {
            clearClickToDrag();
            return;
        }
        // Inside boardArea. Let's find the containing square's row and col
        var col = Math.floor(game.dim * x / game.boardArea.clientWidth);
        var row = Math.floor(game.dim * y / game.boardArea.clientHeight);
        // if the cell is not empty, don't preview the piece, but still show the dragging lines
        if ((game.board[row][col] !== '' && game.deadBoard == null) ||
            (game.board[row][col] == '' && game.deadBoard != null)) {
            clearClickToDrag();
            return;
        }
        clickToDragPiece.style.display = game.deadBoard == null ? "inline" : "none";
        draggingLines.style.display = "inline";
        var centerXY = getSquareCenterXY(row, col);
        verticalDraggingLine.setAttribute("x1", "" + centerXY.x);
        verticalDraggingLine.setAttribute("x2", "" + centerXY.x);
        horizontalDraggingLine.setAttribute("y1", "" + centerXY.y);
        horizontalDraggingLine.setAttribute("y2", "" + centerXY.y);
        // show the piece
        //let cell = document.getElementById('board' + row + 'x' + col).className = $scope.turnIndex === 0 ? 'black' : 'white';
        var topLeft = getSquareTopLeft(row, col);
        clickToDragPiece.style.left = topLeft.left + "px";
        clickToDragPiece.style.top = topLeft.top + "px";
        if (type === "touchend" || type === "touchcancel" || type === "touchleave" || type === "mouseup") {
            // drag ended
            dragDone(row, col);
        }
    }
    function clearClickToDrag() {
        clickToDragPiece.style.display = "none";
        draggingLines.style.display = "none";
    }
    function getSquareTopLeft(row, col) {
        var size = getSquareWidthHeight();
        return { top: row * size.height, left: col * size.width };
    }
    function getSquareWidthHeight() {
        var boardArea = document.getElementById("boardArea");
        return {
            width: boardArea.clientWidth / (game.dim),
            height: boardArea.clientHeight / (game.dim)
        };
    }
    function getSquareCenterXY(row, col) {
        var size = getSquareWidthHeight();
        return {
            x: col * size.width + size.width / 2,
            y: row * size.height + size.height / 2
        };
    }
    function dragDone(row, col) {
        game.$rootScope.$apply(function () {
            if (game.deadBoard == null) {
                game.moveToConfirm = { row: row, col: col };
            }
            else {
                toggleDead(row, col);
                clearClickToDrag();
            }
        });
    }
    function setDeadSets(_deadBoard) {
        game.deadBoard = _deadBoard;
    }
    function resetDeadSets() {
        game.allSets = null;
        game.deadBoard = null;
    }
    function initDeadSets() {
        var sets = gameLogic.getSets(game.board);
        game.allSets = sets.white.concat(sets.black);
        game.deadBoard = gameLogic.createNewBoardWithElement(game.dim, false);
    }
    function toggleDead(row, col) {
        if (game.deadBoard == null || game.allSets == null)
            return; // defensive programming
        if (game.board[row][col] == '')
            return; // nothing there
        var set = findSet(row, col);
        for (var _i = 0, set_1 = set; _i < set_1.length; _i++) {
            var point = set_1[_i];
            game.deadBoard[point[0]][point[1]] = !game.deadBoard[point[0]][point[1]];
        }
    }
    function isDead(row, col) {
        return game.deadBoard && game.deadBoard[row][col];
    }
    game.isDead = isDead;
    function findSet(row, col) {
        for (var _i = 0, allSets_1 = game.allSets; _i < allSets_1.length; _i++) {
            var points = allSets_1[_i];
            for (var _a = 0, points_1 = points; _a < points_1.length; _a++) {
                var point = points_1[_a];
                if (point[0] == row && point[1] == col)
                    return points;
            }
        }
        throw new Error("Couldn't find set for row=" + row + " col=" + col);
    }
    function setDim(d) {
        game.dim = d;
        game.hasDim = true;
        game.board = gameLogic.createNewBoard(game.dim);
        game.boardBeforeMove = gameLogic.createNewBoard(game.dim);
    }
    game.setDim = setDim;
    function communityUI(communityUI) {
        log.info("Game got communityUI:", communityUI);
        // If only proposals changed, then do NOT call updateUI. Then update proposals.
        var nextUpdateUI = {
            playersInfo: [],
            playMode: communityUI.yourPlayerIndex,
            numberOfPlayers: communityUI.numberOfPlayers,
            state: communityUI.state,
            turnIndex: communityUI.turnIndex,
            endMatchScores: communityUI.endMatchScores,
            yourPlayerIndex: communityUI.yourPlayerIndex,
        };
        if (angular.equals(game.yourPlayerInfo, communityUI.yourPlayerInfo) &&
            game.currentUpdateUI && angular.equals(game.currentUpdateUI, nextUpdateUI)) {
        }
        else {
            // Things changed, so call updateUI.
            updateUI(nextUpdateUI);
            if (!game.hasDim)
                setDim(19); // Community matches are always 19x19.
        }
        // This must be after calling updateUI, because we nullify things there (like playerIdToProposal&proposals&etc)
        game.yourPlayerInfo = communityUI.yourPlayerInfo;
        game.playerIdToProposal = communityUI.playerIdToProposal;
        game.didMakeMove = !!game.playerIdToProposal[communityUI.yourPlayerInfo.playerId];
        game.proposals = gameLogic.createNewBoardWithElement(game.dim, 0);
        game.proposals[-1] = [];
        game.proposals[-1][-1] = 0; // number of times we proposed to pass.
        for (var playerId in game.playerIdToProposal) {
            var proposal = game.playerIdToProposal[playerId];
            var delta_1 = proposal.data.delta;
            game.proposals[delta_1.row][delta_1.col]++;
        }
    }
    function getBoardPiece(row, col) {
        var piece = game.board[row][col];
        var pieceBefore = game.boardBeforeMove[row][col];
        var isProposal = game.proposals && game.proposals[row][col] > 0;
        return isProposal ? (game.currentUpdateUI.turnIndex == 0 ? 'B' : 'W') :
            !piece && !pieceBefore ? '' : (piece == 'B' || pieceBefore == 'B' ? 'B' : 'W');
    }
    game.getBoardPiece = getBoardPiece;
    function isProposal1(row, col) {
        return game.proposals && game.proposals[row][col] == 1;
    }
    game.isProposal1 = isProposal1;
    function isProposal2(row, col) {
        return game.proposals && game.proposals[row][col] == 2;
    }
    game.isProposal2 = isProposal2;
    function updateUI(params) {
        log.info("Game got updateUI:", params);
        game.currentUpdateUI = params;
        game.didMakeMove = false; // Only one move per updateUI
        game.proposals = null;
        game.playerIdToProposal = null;
        game.yourPlayerInfo = null;
        game.score = { white: 0, black: 0 };
        resetDeadSets();
        clearClickToDrag();
        game.moveToConfirm = null;
        if (isFirstMove()) {
            game.hasDim = false;
            game.delta = null;
            game.board = gameLogic.createNewBoard(game.dim);
            game.boardBeforeMove = gameLogic.createNewBoard(game.dim);
            game.passes = 0;
        }
        else {
            var state = params.state;
            game.board = state.board;
            game.hasDim = true;
            game.dim = game.board.length;
            game.boardBeforeMove = state.boardBeforeMove;
            game.delta = state.delta;
            game.passes = state.passes;
            setDeadSets(state.deadBoard);
            if (game.passes == 2) {
                calcScore();
            }
            if (showContinuePlayingOrAgreeButtons()) {
                showModal('MODAL_TITLE_AGREE_WITH_DEAD', 'MODAL_BODY_AGREE_WITH_DEAD');
            }
        }
        game.turnIndex = params.turnIndex;
        clickToDragPiece.src = "imgs/" + (game.turnIndex === 0 ? 'black' : 'white') + "Stone.svg";
        if (isComputerTurn()) {
            game.$timeout(maybeSendComputerMove, 500);
        }
    }
    function calcScore() {
        game.score = { white: 0, black: 0 };
        var liveBoard = angular.copy(game.board);
        var emptyBoard = gameLogic.createNewBoard(game.dim); // has 'W' in all empty places.
        for (var row = 0; row < game.dim; row++) {
            for (var col = 0; col < game.dim; col++) {
                if (game.deadBoard && game.deadBoard[row][col])
                    liveBoard[row][col] = '';
                if (liveBoard[row][col] == '')
                    emptyBoard[row][col] = 'W';
            }
        }
        var sets = gameLogic.getSets(liveBoard);
        for (var _i = 0, _a = sets.white; _i < _a.length; _i++) {
            var set = _a[_i];
            game.score.white += set.length;
        }
        for (var _b = 0, _c = sets.black; _b < _c.length; _b++) {
            var set = _c[_b];
            game.score.black += set.length;
        }
        var emptySets = gameLogic.getSets(emptyBoard).white;
        // For each empty group, decide if it's surrounded by black/white/both.
        for (var _d = 0, emptySets_1 = emptySets; _d < emptySets_1.length; _d++) {
            var emptySet = emptySets_1[_d];
            var neighborColor = '';
            for (var _e = 0, emptySet_1 = emptySet; _e < emptySet_1.length; _e++) {
                var point = emptySet_1[_e];
                var row = point[0];
                var col = point[1];
                neighborColor = updateColor(row - 1 >= 0 ? liveBoard[row - 1][col] : '', neighborColor);
                neighborColor = updateColor(row + 1 < game.dim ? liveBoard[row + 1][col] : '', neighborColor);
                neighborColor = updateColor(col - 1 >= 0 ? liveBoard[row][col - 1] : '', neighborColor);
                neighborColor = updateColor(col + 1 < game.dim ? liveBoard[row][col + 1] : '', neighborColor);
                if (neighborColor == 'Both')
                    break;
            }
            if (neighborColor == 'W')
                game.score.white += emptySet.length;
            else if (neighborColor == 'B')
                game.score.black += emptySet.length;
        }
    }
    game.calcScore = calcScore;
    function updateColor(color, neighborColor) {
        return color == '' ? neighborColor : (neighborColor == color || neighborColor == '' ? color : 'Both');
    }
    function maybeSendComputerMove() {
        if (!isComputerTurn())
            return;
        var move = gameLogic.createComputerMove(game.boardBeforeMove, game.board, game.passes, game.turnIndex);
        log.info("Computer move: ", move);
        makeMove(move);
    }
    function makeMove(move) {
        if (game.didMakeMove) {
            return;
        }
        game.didMakeMove = true;
        if (!game.proposals) {
            gameService.makeMove(move);
        }
        else {
            var delta_2 = move.state.delta;
            var isPass = delta_2.row == -1 && delta_2.col == -1;
            var myProposal = {
                data: {
                    delta: delta_2,
                    deadBoard: move.state.deadBoard,
                },
                chatDescription: isPass ? "Pass" : indexToLetter(delta_2.col) + indexToNumber(delta_2.row),
                playerInfo: game.yourPlayerInfo,
            };
            // Decide whether we make a move or not (if we have 2 other proposals supporting the same thing).
            if (game.proposals[delta_2.row][delta_2.col] < 2) {
                move = null;
            }
            else {
                // yes, making a move! The only tricky part is the last move when we select dead groups:
                if (move.state.deadBoard) {
                    // we have 3 proposals for selecting dead groups. I decided that a piece is dead if 2 proposals
                    // at least agreed that it's dead (so one nasty player won't mess up the score).
                    var deadBoardProposals = [move.state.deadBoard];
                    for (var playerId in game.playerIdToProposal) {
                        var deadBoard_1 = game.playerIdToProposal[playerId].data.deadBoard;
                        if (deadBoard_1)
                            deadBoardProposals.push(deadBoard_1);
                    }
                    var chosenDeadBoardProposal = gameLogic.createNewBoardWithElement(game.dim, false);
                    for (var row = 0; row < game.dim; row++) {
                        for (var col = 0; col < game.dim; col++) {
                            var deadCount = 0;
                            for (var _i = 0, deadBoardProposals_1 = deadBoardProposals; _i < deadBoardProposals_1.length; _i++) {
                                var deadBoardProposal = deadBoardProposals_1[_i];
                                if (deadBoardProposal[row][col])
                                    deadCount++;
                            }
                            chosenDeadBoardProposal[row][col] = (deadCount >= 2);
                        }
                    }
                    move.state.deadBoard = chosenDeadBoardProposal;
                }
            }
            gameService.communityMove(myProposal, move);
        }
    }
    function isFirstMove() {
        return !game.currentUpdateUI.state;
    }
    function yourPlayerIndex() {
        return game.currentUpdateUI.yourPlayerIndex;
    }
    function isComputer() {
        var playerInfo = game.currentUpdateUI.playersInfo[game.currentUpdateUI.yourPlayerIndex];
        return playerInfo && playerInfo.playerId === '';
    }
    function isComputerTurn() {
        return isMyTurn() && isComputer();
    }
    game.isComputerTurn = isComputerTurn;
    function isHumanTurn() {
        return isMyTurn() && !isComputer();
    }
    game.isHumanTurn = isHumanTurn;
    function isMyTurn() {
        return !game.didMakeMove &&
            game.currentUpdateUI.turnIndex >= 0 &&
            game.currentUpdateUI.yourPlayerIndex === game.currentUpdateUI.turnIndex; // it's my turn
    }
    game.isMyTurn = isMyTurn;
    function passClicked() {
        //Clicking on the PASS button triggers this function
        //It will increment the number of passes.
        log.log(["Clicked on pass.", game.passes]);
        game.moveToConfirm = { row: -1, col: -1 };
        clearClickToDrag();
    }
    game.passClicked = passClicked;
    function isPassBtnEnabled() {
        return !game.currentUpdateUI.endMatchScores && game.deadBoard == null;
    }
    game.isPassBtnEnabled = isPassBtnEnabled;
    function getPassBtnClasses() {
        return (isConfirmingPass() ? 'confirmingPass' : '') + ' text passBtn ' +
            (isPassBtnEnabled() ? 'pass' + game.passes : 'btnAsText');
    }
    game.getPassBtnClasses = getPassBtnClasses;
    function isConfirmingPass() {
        return game.deadBoard == null && game.moveToConfirm && game.moveToConfirm.row == -1 && game.moveToConfirm.col == -1;
    }
    game.isConfirmingPass = isConfirmingPass;
    function shouldHidePassButton() {
        return showContinuePlayingOrAgreeButtons() || isComputerTurn() || (!isMyTurn() && !game.currentUpdateUI.endMatchScores) || game.hidePassButtonForTesting;
    }
    game.shouldHidePassButton = shouldHidePassButton;
    function getButtonValue() {
        if (game.currentUpdateUI.endMatchScores) {
            return translate('GAME_OVER', { BLACK_SCORE: '' + game.score.black, WHITE_SCORE: '' + game.score.white });
        }
        switch (game.passes) {
            case 0: return translate('PASS');
            case 1: return translate(game.deadBoard != null ? 'SELECT_DEAD' : 'END_GAME');
            default: return translate('PASS');
        }
    }
    game.getButtonValue = getButtonValue;
    function cellClicked(rrow, ccol) {
        log.log(["Clicked on cell:", rrow, ccol]);
        if (!isHumanTurn()) {
            return;
        }
        try {
            var delta_3 = { row: rrow, col: ccol };
            var move = gameLogic.createMove(game.boardBeforeMove, game.board, game.passes, game.deadBoard, delta_3, game.turnIndex);
            makeMove(move);
        }
        catch (e) {
            log.log(["Cannot make move:", rrow, ccol, e]);
            return;
        }
    }
    function shouldSlowlyDrop(rrow, ccol) {
        return game.delta &&
            game.delta.row === rrow &&
            game.delta.col === ccol;
    }
    game.shouldSlowlyDrop = shouldSlowlyDrop;
    function shouldExplode(row, col) {
        return game.boardBeforeMove[row][col] && !game.board[row][col];
    }
    game.shouldExplode = shouldExplode;
    // Returns "A" ... (but skip over "I"), see http://www.5z.com/psp/goboard.jpg
    function indexToNumber(i) {
        return game.dim - i;
    }
    game.indexToNumber = indexToNumber;
    function indexToLetter(i) {
        return String.fromCharCode(65 + (i < 8 ? i : i + 1));
    }
    game.indexToLetter = indexToLetter;
    function fontSizePx() {
        // for iphone4 (min(width,height)=320) it should be 8.
        return 8 * Math.min(window.innerWidth, window.innerHeight) / 320;
    }
    game.fontSizePx = fontSizePx;
})(game || (game = {}));
angular.module('myApp', ['gameServices'])
    .run(['$rootScope', '$timeout',
    function ($rootScope, $timeout) {
        $rootScope['game'] = game;
        game.init($rootScope, $timeout);
    }]);
