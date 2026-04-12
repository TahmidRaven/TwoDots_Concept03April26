import { _decorator, Component, Label, CCInteger, ProgressBar, Node, Vec3, v3, tween, UIOpacity } from 'cc';
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
    @property(ProgressBar) progressBar: ProgressBar = null!;
    @property(TypewriterEffect) typewriter: TypewriterEffect = null!;
    @property(VictoryScreen) victoryScreen: VictoryScreen = null!;

    @property(Node) warningNode: Node = null!;
    
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
    private _isWarningActive: boolean = false;

    public get isGameOver() { return this._isGameOver; }
    public get hasGameStarted() { return this._gameStarted; }

    onLoad() { 
        GameManager.instance = this; 
        this._moves = this.maxMoves;
        this._timeLeft = this.startTimeSeconds;
        this._isWarningActive = false;

        if (this.warningNode) {
            this.warningNode.active = false;
            const opacity = this.warningNode.getComponent(UIOpacity);
            if (opacity) opacity.opacity = 255;
            this.warningNode.setScale(v3(1, 1, 1));
        }

        if (this.progressBar) this.progressBar.progress = 0;
    }

    start() {
        this.updateUI();
        if (this.gridController) this.gridController.initGrid();
        if (this.bgm) this.bgm.play();

        if (this.typewriter) {
            this.typewriter.play("Connect the dots to reveal the image");
        }
        AdManager.gameReady();
    }

    update(dt: number) {
        if (this._gameStarted && !this._isGameOver) {
            this._timeLeft -= dt;

            // Trigger warning if time is 10s or less
            if (this._timeLeft <= 10) {
                this.triggerWarning();
            }

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

    private triggerWarning() {
        if (this._isWarningActive || !this.warningNode) return;
        this._isWarningActive = true;
        this.warningNode.active = true;

        const opacityComp = this.warningNode.getComponent(UIOpacity);

        // Pulse Scale
        tween(this.warningNode)
            .to(0.6, { scale: v3(1.15, 1.15, 1) }, { easing: 'sineInOut' })
            .to(0.6, { scale: v3(1, 1, 1) }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();

        // Pulse Opacity if component exists
        if (opacityComp) {
            tween(opacityComp)
                .to(0.6, { opacity: 120 }, { easing: 'sineInOut' })
                .to(0.6, { opacity: 255 }, { easing: 'sineInOut' })
                .union()
                .repeatForever()
                .start();
        }
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

        // Trigger warning if moves are 5 or less
        if (this._moves <= 5) {
            this.triggerWarning();
        }

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
        
        // Stop the warning pulse on game end
        if (this.warningNode) {
            tween(this.warningNode).stop();
            const opacity = this.warningNode.getComponent(UIOpacity);
            if (opacity) tween(opacity).stop();
            this.warningNode.active = false;
        }

        if (win && this.winSfx) this.winSfx.play();
        else if (!win && this.failSfx) this.failSfx.play();

        AdManager.gameEnd();
        if (this.victoryScreen) this.victoryScreen.show(win);
    }
}