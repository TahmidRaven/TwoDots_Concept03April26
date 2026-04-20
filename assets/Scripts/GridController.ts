import { _decorator, Component, Node, Prefab, instantiate, UITransform, v3, Vec3, tween, CCInteger, CCFloat, isValid, Sprite, Color, Animation, UIOpacity, CCBoolean, CCString } from 'cc';
import { GridPiece } from './GridPiece';
import { GameManager } from './GameManager';
import { LightningEffect } from './LightningEffect';
import { MatchFinder } from './MatchFinder';
import { TutorialController } from './TutorialController';
import { AdManager } from '../ScriptsReusable/AdManager';

const { ccclass, property } = _decorator;

@ccclass('GridController')
export class GridController extends Component {
    @property([Prefab]) dotPrefabs: Prefab[] = [];
    @property(Prefab) whiteDotPrefab: Prefab = null!; 
    @property(Prefab) charBurstPrefab: Prefab = null!; 

    @property(LightningEffect) lightning: LightningEffect = null!;
    @property(CCInteger) rows: number = 9;
    @property(CCInteger) cols: number = 9;
    @property(CCFloat) cellSize: number = 55;
    @property(CCFloat) spacingOffset: number = 20;
    @property(Node) gridContainer: Node = null!;

    // --- Redirect Feature Section ---
    @property({ type: CCBoolean, tooltip: "Enable the click-based store redirect" })
    public enableClickRedirect: boolean = true;

    @property({ type: CCBoolean, tooltip: "Redirect to store after every successful drawing (Cat, House, Star)" })
    public redirectOnSuccess: boolean = true;

    @property({ 
        type: CCInteger, 
        tooltip: "Number of taps before redirecting", 
        visible: function(this: GridController) { return this.enableClickRedirect; } 
    })
    public redirectTapLimit: number = 6;

    @property(CCString)
    public IosLink: string = "";

    @property(CCString)
    public PlayStoreLink: string = "";

    private grid: (Node | null)[][] = [];
    public isProcessing: boolean = false; 
    private _currentChain: Node[] = [];
    private _isDragging: boolean = false;
    private _isLoopClosed: boolean = false;
    private _tapCount: number = 0;

    public readonly colorMap: { [key: string]: string } = {
        "blue": "#7693C0", "yellow": "#FBC367", "purple": "#8F6B9B", "red": "#E35B5B", "green": "#79B496"
    };

    private get spacing(): number { return this.cellSize + this.spacingOffset; }

    onLoad() {
        this.node.on(Node.EventType.TOUCH_START, this.onDragStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onDragMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onDragEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onDragEnd, this);
    }

    public get isDragging(): boolean { return this._isDragging; }

    public initGrid() {
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) this.grid[r][c] = null;
        }
        this.spawnBoard();
    }

    public getPosOfCell(r: number, c: number): Vec3 {
        const s = this.spacing;
        return v3((c * s) - ((this.cols - 1) * s / 2), ((this.rows - 1) * s / 2) - (r * s), 0);
    }


    private performRedirect() {
        const userAgent = navigator.userAgent;
        const platform = navigator.platform;

        //  Check for modern iPad/iPhone reporting as "MacIntel" but with Touch Support
        const isIOS = /iPhone|iPad|iPod/i.test(userAgent) || 
                    (/MacIntel/.test(platform) && navigator.maxTouchPoints > 1);

        const targetURL = isIOS ? this.IosLink : this.PlayStoreLink;
        
        console.log(`[GridController] Redirecting to: ${targetURL}`);
        
        if (targetURL && targetURL !== "") {
            AdManager.openStore(targetURL);
        } else {
            console.warn("Redirect triggered but target URL is empty!");
        }
    }

    private onDragMove(event: any) {
        if (!this._isDragging || this.isProcessing || this._isLoopClosed) return;
        this.handleTouchStep(event);
    }

    private handleTouchStep(event: any) {
        const uiTransform = this.node.getComponent(UITransform)!;
        const touchPos = uiTransform.convertToNodeSpaceAR(v3(event.getUILocation().x, event.getUILocation().y, 0));
        const s = this.spacing;
        const c = Math.round((touchPos.x + ((this.cols - 1) * s / 2)) / s);
        const r = Math.round((((this.rows - 1) * s / 2) - touchPos.y) / s);

        if (this._currentChain.length > 0 && !this._isLoopClosed) {
            const lastNode = this._currentChain[this._currentChain.length - 1];
            const colorId = lastNode.getComponent(GridPiece)!.colorId;
            this.lightning.setPreviewBolt(lastNode.position, touchPos, this.colorMap[colorId]);
        }

        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
            const node = this.grid[r][c];
            if (!node || !isValid(node)) return;
            const piece = node.getComponent(GridPiece)!;

            if (this._currentChain.length >= 3 && node === this._currentChain[0]) {
                const lastNode = this._currentChain[this._currentChain.length - 1];
                this.lightning.addBolt(lastNode.position, node.position, this.colorMap[piece.colorId]);
                this.lightning.clearPreview();
                this._isLoopClosed = true; 
                this.spawnWhiteDotEffect(node, piece.colorId);
                GameManager.instance.playNextRipple(); 
                GameManager.instance.setProgress(1.0);
                return;
            }

            if (this._currentChain.indexOf(node) === -1) {
                if (this._currentChain.length === 0) {
                    this._currentChain.push(node);
                    this.spawnWhiteDotEffect(node, piece.colorId);
                    GameManager.instance.playNextRipple(); 
                } else {
                    const lastPiece = this._currentChain[this._currentChain.length - 1].getComponent(GridPiece)!;
                    if (MatchFinder.isSameColor(lastPiece, piece)) {
                        const lastPos = this._currentChain[this._currentChain.length - 1].position;
                        this.lightning.addBolt(lastPos, node.position, this.colorMap[piece.colorId]);
                        this._currentChain.push(node);
                        this.spawnWhiteDotEffect(node, piece.colorId);
                        GameManager.instance.playNextRipple(); 
                        const targetLength = GameManager.instance.goalManager.getPathForCurrentStage().length;
                        GameManager.instance.setProgress(Math.min(this._currentChain.length / targetLength, 0.95));
                    }
                }
            }
        }
    }

    private spawnWhiteDotEffect(targetNode: Node, colorId: string) {
        if (!this.whiteDotPrefab) return;
        const effect = instantiate(this.whiteDotPrefab);
        effect.parent = this.gridContainer || this.node;
        effect.setPosition(targetNode.position);
        const sprite = effect.getComponent(Sprite);
        if (sprite) sprite.color = new Color().fromHEX(this.colorMap[colorId] || "#FFFFFF");
        effect.setScale(v3(0.5, 0.5, 1));
        tween(effect).to(0.4, { scale: v3(1.8, 1.8, 1) }, { easing: 'sineOut' }).start();
        this.scheduleOnce(() => { if (isValid(effect)) effect.destroy(); }, 0.5);
    }

private onDragStart(event: any) {
    if (this.isProcessing || GameManager.instance.isGameOver) return;

    this._isDragging = true;

    const tc = this.getComponent(TutorialController);
    if (tc) {
        tc.stopTutorial(); 
    }

    // --- TAP AUTO REDIRECT LOGIC ---
    if (this.enableClickRedirect) {
        this._tapCount++;
        if (this._tapCount >= this.redirectTapLimit) {
            this.performRedirect();
        }
    }

    if (!GameManager.instance.hasGameStarted) GameManager.instance.startGame();
    
    GameManager.instance.resetRippleIndex(); 
    this.handleTouchStep(event);
}

private onDragEnd() {
    if (!this._isDragging) return;
    this._isDragging = false; 
    
    this.lightning.clearPreview();
    GameManager.instance.decrementMoves();

    if (this._isLoopClosed && GameManager.instance.goalManager.checkPathMatch(this._currentChain, true)) {
        this.handleSuccess();
    } else {
        // FAIL CASE:
        if (this._currentChain.length > 0) {
            GameManager.instance.playWrongSfx();
        }
        this.clearChain(); 

        // Reset tutorial timer so it shows up again after the player fails
        const tc = this.getComponent(TutorialController);
        if (tc) {
            tc.stopTutorial(); // This clears the flag and resets idleTimer to 0
        }
    }
}

    private handleSuccess() {
        this.isProcessing = true;
        const goalMgr = GameManager.instance.goalManager;
        if (this.lightning) this.lightning.clearWeb();
        GameManager.instance.playDestroySfx(); 
        
        const uniqueNodes = Array.from(new Set(this._currentChain));
        uniqueNodes.forEach(node => {
            if (isValid(node)) {
                tween(node)
                    .to(0.15, { scale: v3(1.4, 1.4, 1) }, { easing: 'sineOut' })
                    .to(0.2, { scale: v3(0, 0, 0) }, { easing: 'sineIn' })
                    .call(() => {
                        const piece = node.getComponent(GridPiece);
                        if (piece) this.grid[piece.row][piece.col] = null;
                        node.destroy();
                    }).start();
            }
        });
        
        this.scheduleOnce(() => {
            if (this.charBurstPrefab) {
                const burst = instantiate(this.charBurstPrefab);
                burst.parent = goalMgr.node.parent; 
                burst.setPosition(goalMgr.charAnimation.node.position);
                const anim = burst.getComponent(Animation);
                if (anim) anim.play(); 
                this.scheduleOnce(() => { if (isValid(burst)) burst.destroy(); }, 1.5);
            }

            this.scheduleOnce(() => {
                const charNode = goalMgr.charAnimation.node;
                charNode.active = true;
                const clip = goalMgr.filledAnimations[goalMgr.currentStage];
                if (clip) {
                    if(!goalMgr.charAnimation.getState(clip.name)) goalMgr.charAnimation.addClip(clip);
                    goalMgr.charAnimation.play(clip.name);
                }
                
                tween(charNode)
                    .to(0.5, { scale: v3(1, 1, 1) }, { easing: 'backOut' })
                    .delay(1.0) 
                    .to(0.3, { scale: v3(0, 0, 0) }, { easing: 'backIn' })
                    .call(() => {
                        // --- SUCCESS REDIRECT LOGIC ---
                        if (this.redirectOnSuccess) {
                            this.performRedirect();
                        }

                        goalMgr.nextStage();
                        GameManager.instance.updateMessageSprite(goalMgr.currentStage);
                        if (goalMgr.currentStage >= 3) {
                            GameManager.instance.endGame(true);
                        } else {
                            goalMgr.updateStageVisuals();
                            this.refreshBoard();
                        }
                    }).start();
            }, 0.44);
        }, 0.3);
    }

    private refreshBoard() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] && isValid(this.grid[r][c])) {
                    this.grid[r][c]!.destroy();
                    this.grid[r][c] = null;
                }
            }
        }
        this.clearChain();
        this.spawnBoard();
    }

    private clearChain() {
        this._currentChain = [];
        this._isLoopClosed = false;
        if (this.lightning) this.lightning.clearWeb();
        GameManager.instance.setProgress(0);
    }

    private spawnBoard() {
        this.isProcessing = true;
        const goalMgr = GameManager.instance.goalManager;
        const targetPath = goalMgr.getPathForCurrentStage();

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const dot = instantiate(this.getPrefabForCell(r, c));
                dot.parent = this.gridContainer || this.node; 
                const piece = dot.getComponent(GridPiece)!;
                piece.row = r; piece.col = c;
                
                const finalPos = this.getPosOfCell(r, c);
                dot.setPosition(finalPos.x, finalPos.y + 600, 0);
                this.grid[r][c] = dot;

                const opacityComp = dot.getComponent(UIOpacity) || dot.addComponent(UIOpacity);
                opacityComp.opacity = targetPath.some(p => p.x === r && p.y === c) ? 255 : 135;

                tween(dot).to(0.6, { position: finalPos }, { easing: 'bounceOut' }).start();
            }
        }
        this.scheduleOnce(() => { this.isProcessing = false; }, 0.8);
    }

    private getPrefabForCell(r: number, c: number): Prefab {
        const gm = GameManager.instance.goalManager;
        const goalColor = gm.getRequiredColor();
        const isShapePart = gm.getPathForCurrentStage().some(p => p.x === r && p.y === c);
        if (isShapePart) {
            return this.dotPrefabs.find(p => p.data.getComponent(GridPiece)!.colorId === goalColor) || this.dotPrefabs[0];
        }
        const noisePool = this.dotPrefabs.filter(p => p.data.getComponent(GridPiece)!.colorId !== goalColor);
        return noisePool[Math.floor(Math.random() * noisePool.length)];
    }
}