import { _decorator, Component, Label, CCInteger } from 'cc';
import { GridController } from './GridController';
import { VictoryScreen } from './VictoryScreen';
import { GoalManager } from './GoalManager';
import { AdManager } from '../ScriptsReusable/AdManager';
import { AudioContent } from './AudioContent'; 

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    public static instance: GameManager = null!;

    @property(GridController) gridController: GridController = null!;
    @property(GoalManager) goalManager: GoalManager = null!;
    @property(Label) movesLabel: Label = null!;
    @property(VictoryScreen) victoryScreen: VictoryScreen = null!;
    @property(CCInteger) maxMoves: number = 15;

    // --- Audio Section ---
    @property(AudioContent) bgm: AudioContent = null!;
    @property(AudioContent) winSfx: AudioContent = null!;
    @property(AudioContent) failSfx: AudioContent = null!;
    @property(AudioContent) destroySfx: AudioContent = null!;
    @property(AudioContent) wooshSfx: AudioContent = null!;
    
    // Drag r1 through r20 into this array in the Inspector
    @property([AudioContent]) rippleArray: AudioContent[] = []; 

    private _moves: number = 0;
    private _isGameOver: boolean = false;
    private _gameStarted: boolean = false;
    private _rippleIndex: number = 0; 

    public get isGameOver() { return this._isGameOver; }
    public get hasGameStarted() { return this._gameStarted; }

    onLoad() { 
        GameManager.instance = this; 
        this._moves = this.maxMoves;
    }

    start() {
        this.updateUI();
        if (this.gridController) this.gridController.initGrid();
        
        // Start background music on launch
        if (this.bgm) this.bgm.play(); 
        
        AdManager.gameReady();
    }

    public startGame() {
        if (this._gameStarted) return;
        this._isGameOver = false;
        this._gameStarted = true;
    }

    // --- Ripple Logic ---
    /**
     * Resets the sound sequence to the first pitch (r1).
     */
    public resetRippleIndex() {
        this._rippleIndex = 0; 
    }

    /**
     * Plays the next sound in the sequence (r1, r2, r3...) 
     * and loops back if the chain exceeds the array size.
     */
    public playNextRipple() {
        if (this.rippleArray.length === 0) return;
        
        const sound = this.rippleArray[this._rippleIndex];
        if (sound) sound.play(); 

        this._rippleIndex = (this._rippleIndex + 1) % this.rippleArray.length;
    }

    public playDestroySfx() {
        if (this.destroySfx) this.destroySfx.play();
        if (this.wooshSfx) this.wooshSfx.play();
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
        
        // Play outcome sound
        if (win && this.winSfx) this.winSfx.play();
        else if (!win && this.failSfx) this.failSfx.play();

        AdManager.gameEnd();
        if (this.victoryScreen) this.victoryScreen.show(win);
    }
}