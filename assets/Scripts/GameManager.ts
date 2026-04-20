import { _decorator, Component, Label, CCInteger, ProgressBar, Node, Vec3, v3, tween, UIOpacity, Sprite, SpriteFrame } from 'cc';
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
    @property(Label) timeLabel: Label = null!; 
    @property(ProgressBar) progressBar: ProgressBar = null!;
    @property(VictoryScreen) victoryScreen: VictoryScreen = null!;

    @property(Node) warningNode: Node = null!;
    
    // --- Sprite Message Section ---
    @property(Sprite) messageDisplaySprite: Sprite = null!; 
    @property([SpriteFrame]) messageFrames: SpriteFrame[] = []; // M1, M2, M3

    // --- CTA Image Section ---
    @property(Sprite) ctaImageSprite: Sprite = null!;
    @property(SpriteFrame) ctaWinFrame: SpriteFrame = null!;
    @property(SpriteFrame) ctaLoseFrame: SpriteFrame = null!;

    @property(CCInteger) maxMoves: number = 15;
    @property(CCInteger) startTimeSeconds: number = 59; 

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

        if (this.warningNode) this.warningNode.active = false;
        if (this.progressBar) this.progressBar.progress = 0;
    }

    start() {
        this.updateUI();
        if (this.gridController) this.gridController.initGrid();
        if (this.bgm) this.bgm.play();

        // Initial Message M1
        this.updateMessageSprite(0);
        
        // Notify Ad Network the game is ready
        AdManager.gameReady();
    }

    update(dt: number) {
        if (this._gameStarted && !this._isGameOver) {
            this._timeLeft -= dt;
            
            // Visual feedback for low time
            if (this._timeLeft <= 10) this.triggerWarning();
            
            if (this._timeLeft <= 0) {
                this._timeLeft = 0;
                this.endGame(false); 
            }
            this.updateTimerUI();
        }
    }

/**
 * Updates the top message sprite based on the current stage progress.
 */
public updateMessageSprite(stageIndex: number) {
    if (!this.messageDisplaySprite || this.messageFrames.length === 0) return;
    
    let frameIndex = 0;
    if (stageIndex === 0) {
        frameIndex = 0; // M1: For the first drawing (Home)
    } else if (stageIndex === 1 || stageIndex === 2) {
        frameIndex = 1; // M2: For Star and Cat stages
    } else if (stageIndex >= 3) {
        frameIndex = 2; // M3: Success/Win
    }

    if (this.messageFrames[frameIndex]) {
        this.messageDisplaySprite.spriteFrame = this.messageFrames[frameIndex];
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
        
        // Pulsing warning effect
        tween(this.warningNode)
            .to(0.6, { scale: v3(1.15, 1.15, 1) }, { easing: 'sineInOut' })
            .to(0.6, { scale: v3(1, 1, 1) }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }

    public resetRippleIndex() { this._rippleIndex = 0; }
    
    public playNextRipple() {
        if (this.rippleArray.length === 0) return;
        const sound = this.rippleArray[this._rippleIndex];
        if (sound) sound.play(); 
        this._rippleIndex = (this._rippleIndex + 1) % this.rippleArray.length;
    }

    public playWrongSfx() { if (this.wrongSfx) this.wrongSfx.play(); }
    public playDestroySfx() { if (this.destroySfx) this.destroySfx.play(); }
    public setProgress(value: number) { if (this.progressBar) this.progressBar.progress = value; }

    /**
     * Called by GridController when a player completes a drag.
     */
    public decrementMoves() {
        if (this._isGameOver) return;
        this._moves--;
        this.updateUI();

        if (this._moves <= 5) this.triggerWarning();
        if (this._moves <= 0) this.endGame(false); 
    }

    private updateUI() {
        if (this.movesLabel) this.movesLabel.string = `Moves: ${this._moves}`;
    }

    private updateTimerUI() {
        if (this.timeLabel) this.timeLabel.string = `${Math.ceil(this._timeLeft)}s`;
    }

    public endGame(win: boolean) {
        if (this._isGameOver) return;
        this._isGameOver = true;
        
        // Stop any active warning animations
        if (this.warningNode) {
            tween(this.warningNode).stop();
            this.warningNode.active = false;
        }

        // Set the final CTA frame
        if (this.ctaImageSprite) {
            this.ctaImageSprite.spriteFrame = win ? this.ctaWinFrame : this.ctaLoseFrame;
        }

        // Final UI message update
        if (win) this.updateMessageSprite(3);

        // Play outcome audio
        if (win && this.winSfx) this.winSfx.play();
        else if (!win && this.failSfx) this.failSfx.play();

        // Ad Network reporting
        AdManager.gameEnd();

        // Show result screen
        if (this.victoryScreen) this.victoryScreen.show(win);
    }
}