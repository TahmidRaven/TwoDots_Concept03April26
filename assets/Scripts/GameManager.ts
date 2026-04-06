import { _decorator, Component, Label, CCInteger } from 'cc';
import { GridController } from './GridController';
import { VictoryScreen } from './VictoryScreen';
import { GoalManager } from './GoalManager';
import { AdManager } from '../ScriptsReusable/AdManager';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    public static instance: GameManager = null!;

    @property(GridController) gridController: GridController = null!;
    @property(GoalManager) goalManager: GoalManager = null!;
    @property(Label) movesLabel: Label = null!;
    @property(VictoryScreen) victoryScreen: VictoryScreen = null!;
    @property(CCInteger) maxMoves: number = 15;

    private _moves: number = 0;
    private _isGameOver: boolean = false;
    private _gameStarted: boolean = false;

    public get isGameOver() { return this._isGameOver; }
    public get hasGameStarted() { return this._gameStarted; }

    onLoad() { 
        GameManager.instance = this; 
        this._moves = this.maxMoves;
    }

    start() {
        this.updateUI();
        if (this.gridController) this.gridController.initGrid();
        AdManager.gameReady();
    }

    public startGame() {
        if (this._gameStarted) return;
        this._gameStarted = true;
    }

    public decrementMoves() {
        this._moves--;
        this.updateUI();
        if (this._moves <= 0 && !this._isGameOver) this.endGame(false);
    }

    private updateUI() {
        if (this.movesLabel) this.movesLabel.string = `Moves: ${this._moves}`;
    }

    public endGame(win: boolean) {
        if (this._isGameOver) return;
        this._isGameOver = true;
        AdManager.gameEnd();
        if (this.victoryScreen) this.victoryScreen.show(win);
    }
}