import { _decorator, AudioClip, AudioSource, CCFloat, Component, EventHandler, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AudioContent')
export class AudioContent extends Component {

    @property
    public AudioName : string = "";

    @property(AudioClip)
    public AudioClip : AudioClip = null;

    @property
    public Loop = false;

    @property({type : CCFloat, range : [0, 1]})
    public Volume = 1.0;

    @property
    public PlayOnLoad = false;

    @property(EventHandler)
    public OnPlayingStart : EventHandler = new EventHandler();

    @property(EventHandler)
    public OnPlayingEnd : EventHandler = new EventHandler();

    public AudioSource : AudioSource = null!;

    onLoad() {
        // Ensure AudioSource exists and is configured based on properties
        this.AudioSource = this.getComponent(AudioSource) || this.addComponent(AudioSource);
        this.AudioSource.clip = this.AudioClip;
        this.AudioSource.loop = this.Loop;
        this.AudioSource.volume = this.Volume;
        this.AudioSource.playOnAwake = this.PlayOnLoad;
    }

    public play() {
        if (this.AudioSource) {
            this.AudioSource.play();
            this.OnPlayingStart.emit([this.AudioName]);
        }
    }
}