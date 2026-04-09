import { _decorator, Component, Label, CCInteger, ProgressBar } from 'cc';
import { GridController } from './GridController';
import { VictoryScreen } from './VictoryScreen';
import { GoalManager } from './GoalManager';
import { AdManager } from '../ScriptsReusable/AdManager';
import { AudioContent } from './AudioContent'; 
import { TypewriterEffect } from './TypewriterEffect';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    public static instance: GameManager = null!;

    @property(GridController) gridController: GridController = null!;
    @property(GoalManager) goalManager: GoalManager = null!;
    @property(Label) movesLabel: Label = null!;
    @property(Label) timeLabel: Label = null!; 
    @property(ProgressBar) progressBar: ProgressBar = null!; // Node: ProgressBarColor
    @property(TypewriterEffect) typewriter: TypewriterEffect = null!;
    @property(VictoryScreen) victoryScreen: VictoryScreen = null!;
    
    @property(CCInteger) maxMoves: number = 15;
    @property(CCInteger) startTimeSeconds: number = 59; 

    // --- Audio Section ---
    @property(AudioContent) bgm: AudioContent = null!;
    @property(AudioContent) winSfx: AudioContent = null!;
    @property(AudioContent) failSfx: AudioContent = null!;
    @property(AudioContent) destroySfx: AudioContent = null!;
    @property(AudioContent) wrongSfx: AudioContent = null!; 
    @property(AudioContent) wooshSfx: AudioContent = null!;
    @property([AudioContent]) rippleArray: AudioContent[] = []; 

    private _moves: number = 0;
    private _timeLeft: number = 0;
    private _isGameOver: boolean = false;
    private _gameStarted: boolean = false;
    private _rippleIndex: number = 0; 

    public get isGameOver() { return this._isGameOver; }
    public get hasGameStarted() { return this._gameStarted; }

    onLoad() { 
        GameManager.instance = this; 
        this._moves = this.maxMoves;
        this._timeLeft = this.startTimeSeconds;
        if (this.progressBar) this.progressBar.progress = 0;
    }

    start() {
        this.updateUI();
        if (this.gridController) this.gridController.initGrid();
        if (this.bgm) this.bgm.play();

        if (this.typewriter) {
            this.typewriter.play("Connect Dots To Reveal The Drawing!");
        }
        AdManager.gameReady();
    }

    update(dt: number) {
        if (this._gameStarted && !this._isGameOver) {
            this._timeLeft -= dt;
            if (this._timeLeft <= 0) {
                this._timeLeft = 0;
                this.endGame(false); 
            }
            this.updateTimerUI();
        }
    }

    public startGame() {
        if (this._gameStarted) return;
        this._gameStarted = true;
    }

    public resetRippleIndex() {
        this._rippleIndex = 0; 
    }

    public playNextRipple() {
        if (this.rippleArray.length === 0) return;
        const sound = this.rippleArray[this._rippleIndex];
        if (sound) sound.play(); 
        this._rippleIndex = (this._rippleIndex + 1) % this.rippleArray.length;
    }

    public playWrongSfx() {
        if (this.wrongSfx) this.wrongSfx.play();
    }

    public playDestroySfx() {
        if (this.destroySfx) this.destroySfx.play();
    }

    public setProgress(value: number) {
        if (this.progressBar) this.progressBar.progress = value;
    }

    public decrementMoves() {
        if (this._isGameOver) return;
        this._moves--;
        this.updateUI();
        if (this._moves <= 0) this.endGame(false); 
    }

    private updateUI() {
        if (this.movesLabel) this.movesLabel.string = `Moves: ${this._moves}`;
    }

    private updateTimerUI() {
        if (this.timeLabel) {
            this.timeLabel.string = `${Math.ceil(this._timeLeft)}s`;
        }
    }

    public endGame(win: boolean) {
        if (this._isGameOver) return;
        this._isGameOver = true;
        
        if (win && this.winSfx) this.winSfx.play();
        else if (!win && this.failSfx) this.failSfx.play();

        AdManager.gameEnd();
        if (this.victoryScreen) this.victoryScreen.show(win);
    }
}