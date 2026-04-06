import { _decorator, Component, Node, Vec3, v3, tween, UITransform, CCFloat } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('TutorialHand')
export class TutorialHand extends Component {
    
    @property({ type: CCFloat, tooltip: "How much larger the hand gets during pulse" })
    public pulseMultiplier: number = 1.2;

    @property({ type: CCFloat, tooltip: "Time for one pulse cycle" })
    public pulseDuration: number = 0.5;

    private _baseScale: Vec3 = v3(1, 1, 1);
    private _isShowing: boolean = false;

    onLoad() {
        this._baseScale = this.node.scale.clone();
        this.node.active = false;
        this.node.setScale(v3(0, 0, 0));
    }

    public showAt(pos: Vec3) {
        this.node.active = true;
        this._isShowing = true;
        this.node.setPosition(pos);
        
        tween(this.node).stop();
        this.node.setScale(v3(0, 0, 0)); 

        const targetPulse = v3(this._baseScale.x * this.pulseMultiplier, this._baseScale.y * this.pulseMultiplier, 1);

        tween(this.node)
            .to(0.3, { scale: this._baseScale }, { easing: 'backOut' })
            .repeatForever(
                tween(this.node)
                    .to(this.pulseDuration, { scale: targetPulse }, { easing: 'quadInOut' })
                    .to(this.pulseDuration, { scale: this._baseScale }, { easing: 'quadInOut' })
            )
            .start();
    }

    public hide() {
        this._isShowing = false;
        tween(this.node).stop();
        this.node.setScale(v3(0, 0, 0));
        this.node.active = false;
    }

    public get isShowing(): boolean {
        return this._isShowing;
    }
}